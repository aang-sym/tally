/**
 * Provider Normalization Service
 *
 * Normalizes and deduplicates streaming provider data from TMDB/JustWatch
 * to provide a cleaner user experience by consolidating variants.
 */

interface ProviderVariant {
  id: number;
  name: string;
  logo: string;
  type: string;
}

interface NormalizedProvider {
  parentId: number;
  parentName: string;
  logo: string;
  type: string;
  variants: ProviderVariant[];
  hasMultiplePlans: boolean;
}

interface ProviderMapping {
  parentName: string;
  parentId: number;
  variants: string[];
  keywords: string[]; // For fuzzy matching
  priority: number; // Higher = preferred when multiple matches
}

class ProviderNormalizer {
  private mappings: ProviderMapping[] = [
    {
      parentName: 'Netflix',
      parentId: 8,
      variants: [
        'Netflix Standard with Ads',
        'Netflix basic with ads',
        'Netflix Basic',
        'Netflix Premium',
      ],
      keywords: ['netflix'],
      priority: 10,
    },
    {
      parentName: 'Amazon Prime Video',
      parentId: 119,
      variants: ['Amazon Prime', 'Prime Video'],
      keywords: ['amazon', 'prime'],
      priority: 10,
    },
    {
      parentName: 'Disney Plus',
      parentId: 337,
      variants: ['Disney+', 'Disney Plus'],
      keywords: ['disney'],
      priority: 9,
    },
    {
      parentName: 'HBO Max',
      parentId: 384,
      variants: ['Max', 'HBO', 'HBO Max Amazon Channel'],
      keywords: ['hbo', 'max'],
      priority: 9,
    },
    {
      parentName: 'Hulu',
      parentId: 15,
      variants: ['Hulu (With Ads)', 'Hulu (No Ads)'],
      keywords: ['hulu'],
      priority: 8,
    },
    {
      parentName: 'Apple TV Plus',
      parentId: 350,
      variants: ['Apple TV+', 'Apple TV'],
      keywords: ['apple'],
      priority: 8,
    },
    {
      parentName: 'Paramount Plus',
      parentId: 531,
      variants: ['Paramount+ (With Ads)', 'Paramount+ (No Ads)', 'Paramount Network'],
      keywords: ['paramount'],
      priority: 7,
    },
    {
      parentName: 'Crunchyroll',
      parentId: 283,
      variants: ['Crunchyroll Amazon Channel'],
      keywords: ['crunchyroll'],
      priority: 6,
    },
    {
      parentName: 'Peacock',
      parentId: 386,
      variants: ['Peacock Premium', 'Peacock Premium Plus'],
      keywords: ['peacock'],
      priority: 6,
    },
    {
      parentName: 'Showtime',
      parentId: 37,
      variants: ['Showtime Amazon Channel', 'Paramount+ Showtime'],
      keywords: ['showtime'],
      priority: 5,
    },
    {
      parentName: 'Starz',
      parentId: 43,
      variants: ['Starz Amazon Channel'],
      keywords: ['starz'],
      priority: 5,
    },
  ];

  /**
   * Normalize a list of providers by consolidating variants
   */
  normalizeProviders(providers: ProviderVariant[]): NormalizedProvider[] {
    const normalizedMap = new Map<string, NormalizedProvider>();

    for (const provider of providers) {
      const mapping = this.findMapping(provider.name);

      if (mapping) {
        const key = mapping.parentName;

        if (!normalizedMap.has(key)) {
          // Create new normalized provider entry
          normalizedMap.set(key, {
            parentId: mapping.parentId,
            parentName: mapping.parentName,
            logo: provider.logo, // Use the logo from the first variant found
            type: provider.type,
            variants: [],
            hasMultiplePlans: false,
          });
        }

        const normalized = normalizedMap.get(key)!;
        normalized.variants.push(provider);

        // If this is the main provider (exact name match), use its logo
        if (provider.name === mapping.parentName || provider.id === mapping.parentId) {
          normalized.logo = provider.logo;
        }

        // Mark as having multiple plans if we have variants
        if (normalized.variants.length > 1) {
          normalized.hasMultiplePlans = true;
        }
      } else {
        // No mapping found, treat as standalone provider
        normalizedMap.set(provider.name, {
          parentId: provider.id,
          parentName: provider.name,
          logo: provider.logo,
          type: provider.type,
          variants: [provider],
          hasMultiplePlans: false,
        });
      }
    }

    return Array.from(normalizedMap.values()).sort((a, b) => {
      // Sort by priority if available, otherwise alphabetically
      const aPriority = this.findMapping(a.parentName)?.priority || 0;
      const bPriority = this.findMapping(b.parentName)?.priority || 0;

      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first
      }

      return a.parentName.localeCompare(b.parentName);
    });
  }

  /**
   * Find the appropriate mapping for a provider name
   */
  private findMapping(providerName: string): ProviderMapping | null {
    const lowerName = providerName.toLowerCase();

    // First, try exact parent name match
    for (const mapping of this.mappings) {
      if (mapping.parentName.toLowerCase() === lowerName) {
        return mapping;
      }
    }

    // Then try variant matches
    for (const mapping of this.mappings) {
      if (mapping.variants.some((variant) => variant.toLowerCase() === lowerName)) {
        return mapping;
      }
    }

    // Finally, try keyword matching (fuzzy)
    for (const mapping of this.mappings) {
      if (mapping.keywords.some((keyword) => lowerName.includes(keyword))) {
        return mapping;
      }
    }

    return null;
  }

  /**
   * Get statistics about normalization results
   */
  getNormalizationStats(
    originalCount: number,
    normalizedCount: number
  ): {
    originalCount: number;
    normalizedCount: number;
    deduplicatedCount: number;
    deduplicationRate: number;
  } {
    const deduplicatedCount = originalCount - normalizedCount;
    const deduplicationRate = originalCount > 0 ? (deduplicatedCount / originalCount) * 100 : 0;

    return {
      originalCount,
      normalizedCount,
      deduplicatedCount,
      deduplicationRate: Math.round(deduplicationRate * 10) / 10, // Round to 1 decimal
    };
  }

  /**
   * Add a new provider mapping (for dynamic expansion)
   */
  addMapping(mapping: ProviderMapping): void {
    this.mappings.push(mapping);
    // Re-sort by priority
    this.mappings.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get all known provider mappings (for debugging/admin)
   */
  getMappings(): ProviderMapping[] {
    return [...this.mappings]; // Return copy to prevent modification
  }
}

// Export singleton instance
export const providerNormalizer = new ProviderNormalizer();

// Export types for use in other modules
export type { ProviderVariant, NormalizedProvider, ProviderMapping };
