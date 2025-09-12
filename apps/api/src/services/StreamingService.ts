/**
 * Streaming Service
 *
 * Handles streaming provider availability data with caching and normalization.
 * Integrates with TMDB watch providers and maintains local streaming service data.
 */

import { supabase } from '../db/supabase.js';
import { tmdbService } from './tmdb.js';
import { providerNormalizer } from './provider-normalizer.js';
import { TMDBProviderListItem } from '@tally/core';

export interface StreamingServiceData {
  id: string;
  tmdb_provider_id: number;
  name: string;
  logo_path?: string;
  homepage?: string;
}

export interface ShowAvailability {
  id: string;
  show_id: string;
  service_id: string;
  country_code: string;
  availability_type: 'subscription' | 'rent' | 'buy';
  price_amount?: number;
  price_currency?: string;
  deep_link?: string;
  updated_at: string;
}

export interface ShowAvailabilityWithService extends ShowAvailability {
  service: StreamingServiceData;
}

export class StreamingService {
  /**
   * Get or create streaming services from TMDB provider data
   */
  async syncStreamingServices(tmdbProviders: any[]): Promise<StreamingServiceData[]> {
    try {
      const services: StreamingServiceData[] = [];

      for (const provider of tmdbProviders) {
        // Check if service already exists
        const { data: existingService, error: fetchError } = await supabase
          .from('streaming_services')
          .select('*')
          .eq('tmdb_provider_id', provider.provider_id)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw fetchError;
        }

        if (existingService) {
          services.push(existingService);
        } else {
          // Create new service
          const serviceData = {
            tmdb_provider_id: provider.provider_id,
            name: provider.provider_name,
            logo_path: provider.logo_path,
            homepage: provider.homepage || null,
          };

          const { data: newService, error: createError } = await supabase
            .from('streaming_services')
            .insert([serviceData])
            .select()
            .single();

          if (createError) {
            console.error('Failed to create streaming service:', createError);
            continue;
          }

          services.push(newService);
        }
      }

      return services;
    } catch (error) {
      console.error('Failed to sync streaming services:', error);
      return [];
    }
  }

  /**
   * Update show availability data from TMDB
   */
  async updateShowAvailability(
    showId: string,
    tmdbId: number,
    country: string = 'US'
  ): Promise<ShowAvailabilityWithService[]> {
    try {
      // Get watch providers from TMDB
      const providers = await tmdbService.getWatchProviders(tmdbId, country);

      if (!providers || providers.length === 0) {
        return [];
      }

      // Sync streaming services
      const services = await this.syncStreamingServices(providers);

      // Clear existing availability for this show and country
      await supabase
        .from('show_availability')
        .delete()
        .eq('show_id', showId)
        .eq('country_code', country);

      // Create new availability records
      const availabilityData = [];

      for (const provider of providers) {
        let service = services.find((s) => s.tmdb_provider_id === provider.provider_id);

        if (!service) {
          // Try to auto-discover the missing provider
          console.log(
            `🔍 Auto-discovering missing provider during availability lookup: ${provider.provider_name} (TMDB ID: ${provider.provider_id})`
          );

          service = await this.autoDiscoverProvider(
            provider.provider_id,
            provider.provider_name,
            provider.logo_path
          );

          if (!service) {
            console.warn(
              `⚠️ Failed to auto-discover provider ${provider.provider_name} (${provider.provider_id})`
            );
            continue;
          }

          // Add the discovered service to our services array for other providers in this loop
          services.push(service);
        }

        // TMDB doesn't provide detailed pricing, so we'll use subscription as default
        availabilityData.push({
          show_id: showId,
          service_id: service.id,
          country_code: country,
          availability_type: 'subscription' as const,
          updated_at: new Date().toISOString(),
        });
      }

      if (availabilityData.length === 0) {
        return [];
      }

      const { data: availability, error: availabilityError } = await supabase
        .from('show_availability')
        .insert(availabilityData).select(`
          *,
          streaming_services (*)
        `);

      if (availabilityError) {
        throw availabilityError;
      }

      return (
        availability?.map((a) => ({
          ...a,
          service: a.streaming_services,
        })) || []
      );
    } catch (error) {
      console.error(`Failed to update show availability for ${showId}:`, error);
      return [];
    }
  }

  /**
   * Get show availability with normalized providers
   */
  async getShowAvailability(
    showId: string,
    country: string = 'US'
  ): Promise<{
    availability: ShowAvailabilityWithService[];
    normalized: any[];
  }> {
    try {
      const { data: availability, error } = await supabase
        .from('show_availability')
        .select(
          `
          *,
          streaming_services (*)
        `
        )
        .eq('show_id', showId)
        .eq('country_code', country)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const availabilityWithServices =
        availability?.map((a) => ({
          ...a,
          service: a.streaming_services,
        })) || [];

      // Normalize providers to consolidate variants
      const providerVariants = availabilityWithServices.map((a) => ({
        id: a.service.tmdb_provider_id,
        name: a.service.name,
        logo: a.service.logo_path ? `https://image.tmdb.org/t/p/w92${a.service.logo_path}` : '',
        type: a.availability_type,
      }));

      const normalized = providerNormalizer.normalizeProviders(providerVariants);

      return {
        availability: availabilityWithServices,
        normalized: normalized.map((n) => ({
          providerId: n.parentId,
          name: n.parentName,
          logo: n.logo,
          type: n.type,
          hasMultiplePlans: n.hasMultiplePlans,
        })),
      };
    } catch (error) {
      console.error(`Failed to get show availability for ${showId}:`, error);
      return {
        availability: [],
        normalized: [],
      };
    }
  }

  /**
   * Get all streaming services
   */
  async getAllStreamingServices(): Promise<StreamingServiceData[]> {
    try {
      const { data: services, error } = await supabase
        .from('streaming_services')
        .select('*')
        .order('name');

      if (error) throw error;

      return services || [];
    } catch (error) {
      console.error('Failed to get all streaming services:', error);
      return [];
    }
  }

  /**
   * Get user's subscription analysis
   */
  async getUserSubscriptionAnalysis(userId: string): Promise<{
    services: {
      service: StreamingServiceData;
      showCount: number;
      watchingCount: number;
      watchlistCount: number;
      completedCount: number;
    }[];
    totalServices: number;
    recommendedCancellations: string[];
  }> {
    try {
      // Get user's shows with their streaming services
      const { data: userShows, error } = await supabase
        .from('user_shows')
        .select(
          `
          *,
          shows!inner (
            id,
            title,
            show_availability!inner (
              *,
              streaming_services (*)
            )
          )
        `
        )
        .eq('user_id', userId)
        .neq('status', 'dropped');

      if (error) throw error;

      // Group by streaming service
      const serviceMap = new Map<
        string,
        {
          service: StreamingServiceData;
          showCount: number;
          watchingCount: number;
          watchlistCount: number;
          completedCount: number;
        }
      >();

      userShows?.forEach((userShow) => {
        userShow.shows.show_availability?.forEach((availability: any) => {
          const service = availability.streaming_services;
          const serviceId = service.id;

          if (!serviceMap.has(serviceId)) {
            serviceMap.set(serviceId, {
              service,
              showCount: 0,
              watchingCount: 0,
              watchlistCount: 0,
              completedCount: 0,
            });
          }

          const serviceData = serviceMap.get(serviceId)!;
          serviceData.showCount++;

          switch (userShow.status) {
            case 'watching':
              serviceData.watchingCount++;
              break;
            case 'watchlist':
              serviceData.watchlistCount++;
              break;
            case 'completed':
              serviceData.completedCount++;
              break;
          }
        });
      });

      const services = Array.from(serviceMap.values()).sort((a, b) => b.showCount - a.showCount);

      // Simple cancellation recommendations
      const recommendedCancellations = services
        .filter((s) => s.watchingCount === 0 && s.watchlistCount === 0)
        .map((s) => s.service.name);

      return {
        services,
        totalServices: services.length,
        recommendedCancellations,
      };
    } catch (error) {
      console.error('Failed to get user subscription analysis:', error);
      return {
        services: [],
        totalServices: 0,
        recommendedCancellations: [],
      };
    }
  }

  /**
   * Get streaming service statistics
   */
  async getStreamingServiceStats(): Promise<{
    totalServices: number;
    mostPopularServices: {
      service: StreamingServiceData;
      showCount: number;
      userCount: number;
    }[];
  }> {
    try {
      // Get total service count
      const { data: services, error: servicesError } = await supabase
        .from('streaming_services')
        .select('*');

      if (servicesError) throw servicesError;

      // Get service popularity (most shows available)
      const { data: serviceStats, error: statsError } = await supabase
        .from('show_availability')
        .select(
          `
          service_id,
          streaming_services (*)
        `
        )
        .group(['service_id', 'streaming_services']);

      if (statsError) throw statsError;

      // This is a simplified version - in a real implementation you'd want
      // proper aggregation queries for accurate statistics

      return {
        totalServices: services?.length || 0,
        mostPopularServices: [], // Would need more complex aggregation
      };
    } catch (error) {
      console.error('Failed to get streaming service stats:', error);
      return {
        totalServices: 0,
        mostPopularServices: [],
      };
    }
  }

  /**
   * Refresh availability data for stale shows
   */
  async refreshStaleAvailability(limit: number = 10): Promise<void> {
    try {
      // Get shows with old availability data (> 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: staleShows, error } = await supabase
        .from('shows')
        .select(
          `
          id,
          tmdb_id,
          show_availability!left (
            updated_at
          )
        `
        )
        .or(
          `show_availability.updated_at.lt.${sevenDaysAgo.toISOString()},show_availability.is.null`
        )
        .limit(limit);

      if (error) throw error;

      for (const show of staleShows || []) {
        try {
          console.log(`Refreshing availability for show ${show.id}`);
          await this.updateShowAvailability(show.id, show.tmdb_id);

          // Small delay to respect API limits
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Failed to refresh availability for show ${show.id}:`, error);
          continue;
        }
      }
    } catch (error) {
      console.error('Failed to refresh stale availability:', error);
    }
  }

  /**
   * Backfill streaming services from TMDB provider list
   */
  async backfillStreamingServices(regions: string[] = ['US']): Promise<{
    totalFetched: number;
    newProviders: number;
    updatedProviders: number;
    providers: StreamingServiceData[];
    errors: string[];
  }> {
    const result = {
      totalFetched: 0,
      newProviders: 0,
      updatedProviders: 0,
      providers: [] as StreamingServiceData[],
      errors: [] as string[],
    };

    try {
      if (!tmdbService.isAvailable) {
        result.errors.push('TMDB service is not available');
        return result;
      }

      // Get all providers from TMDB for specified regions
      const allProvidersData = await tmdbService.getAllProviders(regions);
      result.totalFetched = allProvidersData.total;

      if (allProvidersData.providers.length === 0) {
        result.errors.push('No providers found from TMDB');
        return result;
      }

      console.log(
        `📺 Found ${allProvidersData.total} providers from TMDB across regions: ${regions.join(', ')}`
      );

      // Convert TMDB providers to our format and sync with database
      const tmdbProviders = allProvidersData.providers.map((provider: TMDBProviderListItem) => ({
        provider_id: provider.provider_id,
        provider_name: provider.provider_name,
        logo_path: provider.logo_path,
        homepage: null, // Will be populated when we encounter the provider in show data
      }));

      // Use existing sync method to create/update providers
      const syncedServices = await this.syncStreamingServices(tmdbProviders);
      result.providers = syncedServices;

      // Count new vs updated
      for (const service of syncedServices) {
        const { data: existing, error } = await supabase
          .from('streaming_services')
          .select('created_at, updated_at')
          .eq('id', service.id)
          .single();

        if (!error && existing) {
          // Consider it new if created recently (within last minute)
          const createdAt = new Date(existing.created_at);
          const isNew = Date.now() - createdAt.getTime() < 60000;

          if (isNew) {
            result.newProviders++;
          } else {
            result.updatedProviders++;
          }
        }
      }

      console.log(
        `✅ Backfill complete: ${result.newProviders} new, ${result.updatedProviders} updated, ${result.totalFetched} total providers`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Failed to backfill streaming services: ${errorMessage}`);
      console.error('Backfill streaming services failed:', error);
    }

    return result;
  }

  /**
   * Auto-discover and create missing providers during regular operations
   */
  async autoDiscoverProvider(
    tmdbProviderId: number,
    providerName: string,
    logoPath?: string
  ): Promise<StreamingServiceData | null> {
    try {
      // Check if provider already exists
      const { data: existingService, error: fetchError } = await supabase
        .from('streaming_services')
        .select('*')
        .eq('tmdb_provider_id', tmdbProviderId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (existingService) {
        return existingService;
      }

      // Create new service
      const serviceData = {
        tmdb_provider_id: tmdbProviderId,
        name: providerName,
        logo_path:
          logoPath && logoPath.includes('/')
            ? logoPath.substring(logoPath.lastIndexOf('/'))
            : logoPath,
        homepage: null,
      };

      const { data: newServices, error: createError } = await supabase
        .from('streaming_services')
        .insert([serviceData])
        .select();

      if (createError) {
        console.error('Failed to auto-discover streaming service:', createError);
        return null;
      }

      const newService = newServices ? newServices[0] : null;

      if (!newService) {
        console.error('Failed to retrieve newly created service during auto-discovery.');
        return null;
      }

      console.log(
        `🔍 Auto-discovered new streaming provider: ${providerName} (TMDB ID: ${tmdbProviderId})`
      );
      return newService;
    } catch (error) {
      console.error(`Failed to auto-discover provider ${providerName} (${tmdbProviderId}):`, error);
      return null;
    }
  }
}

// Export singleton instance
export const streamingService = new StreamingService();
