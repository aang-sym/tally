/**
 * Streaming Availability API Client
 *
 * Integrates with RapidAPI's Streaming Availability service to get real-time
 * data about content availability across streaming platforms.
 */
export class StreamingAvailabilityError extends Error {
    statusCode;
    rateLimitReset;
    constructor(message, statusCode, rateLimitReset) {
        super(message);
        this.statusCode = statusCode;
        this.rateLimitReset = rateLimitReset;
        this.name = 'StreamingAvailabilityError';
    }
}
export class StreamingAvailabilityClient {
    baseUrl = 'https://streaming-availability.p.rapidapi.com';
    apiKey;
    rateLimitDelay = 1000; // 1 second between requests
    constructor(apiKey) {
        if (!apiKey) {
            throw new Error('Streaming Availability API key is required');
        }
        this.apiKey = apiKey;
    }
    async makeRequest(endpoint, params = {}) {
        const url = new URL(`${this.baseUrl}${endpoint}`);
        // Add query parameters
        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.append(key, value);
        });
        const response = await fetch(url.toString(), {
            headers: {
                'X-RapidAPI-Key': this.apiKey,
                'X-RapidAPI-Host': 'streaming-availability.p.rapidapi.com',
            },
        });
        // Handle rate limiting
        if (response.status === 429) {
            const resetTime = response.headers.get('X-RateLimit-Reset');
            const resetMs = resetTime ? parseInt(resetTime) * 1000 - Date.now() : this.rateLimitDelay;
            throw new StreamingAvailabilityError('Rate limit exceeded', 429, resetMs);
        }
        if (!response.ok) {
            throw new StreamingAvailabilityError(`API request failed: ${response.statusText}`, response.status);
        }
        return response.json();
    }
    /**
     * Search for shows/movies by title
     */
    async search(title, country = 'us', showType, limit = 20) {
        const params = {
            keyword: title,
            country,
            output_language: 'en',
        };
        if (showType) {
            params.show_type = showType;
        }
        if (limit) {
            params.limit = limit.toString();
        }
        return this.makeRequest('/search/title', params);
    }
    /**
     * Get detailed information about a specific show/movie by ID
     */
    async getShow(id, country = 'us') {
        return this.makeRequest('/get', {
            id,
            country,
            output_language: 'en',
        });
    }
    /**
     * Get shows that are leaving streaming services soon
     */
    async getLeavingSoon(country = 'us', service, limit = 50) {
        const params = {
            country,
            output_language: 'en',
        };
        if (service) {
            params.service = service;
        }
        if (limit) {
            params.limit = limit.toString();
        }
        const result = await this.makeRequest('/changes/leaving', params);
        return result.shows;
    }
    /**
     * Get shows that are newly available on streaming services
     */
    async getNewlyAdded(country = 'us', service, limit = 50) {
        const params = {
            country,
            output_language: 'en',
        };
        if (service) {
            params.service = service;
        }
        if (limit) {
            params.limit = limit.toString();
        }
        const result = await this.makeRequest('/changes/added', params);
        return result.shows;
    }
    /**
     * Get available streaming services for a country
     */
    async getServices(country = 'us') {
        const result = await this.makeRequest('/services', {
            country,
        });
        return result;
    }
    /**
     * Helper method to check if content is available on specific service
     */
    isAvailableOnService(availability, serviceId, country = 'us') {
        const countryOptions = availability.streamingOptions[country] || [];
        return countryOptions.find(option => option.service.id === serviceId) || null;
    }
    /**
     * Helper method to get expiration date for content on a service
     */
    getExpirationDate(availability, serviceId, country = 'us') {
        const option = this.isAvailableOnService(availability, serviceId, country);
        return option?.expiresOn ? new Date(option.expiresOn * 1000) : null;
    }
    /**
     * Helper method to check if content is leaving soon (within days)
     */
    isLeavingSoon(availability, serviceId, days = 30, country = 'us') {
        const expirationDate = this.getExpirationDate(availability, serviceId, country);
        if (!expirationDate)
            return false;
        const daysUntilExpiration = (expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        return daysUntilExpiration <= days && daysUntilExpiration > 0;
    }
}
export default StreamingAvailabilityClient;
