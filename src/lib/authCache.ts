/**
 * Simple in-memory cache for authentication-related data
 * Reduces redundant database queries during sign-in
 */

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number; // Time to live in milliseconds
}

class AuthCache {
    private cache = new Map<string, CacheEntry<any>>();

    /**
     * Set a cache entry with TTL
     */
    set<T>(key: string, data: T, ttlMs: number): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl: ttlMs,
        });
    }

    /**
     * Get a cache entry if it exists and hasn't expired
     */
    get<T>(key: string): T | null {
        const entry = this.cache.get(key);

        if (!entry) {
            return null;
        }

        const age = Date.now() - entry.timestamp;

        if (age > entry.ttl) {
            // Expired, remove it
            this.cache.delete(key);
            return null;
        }

        return entry.data as T;
    }

    /**
     * Clear a specific cache entry
     */
    clear(key: string): void {
        this.cache.delete(key);
    }

    /**
     * Clear all cache entries
     */
    clearAll(): void {
        this.cache.clear();
    }

    /**
     * Clear expired entries (garbage collection)
     */
    clearExpired(): void {
        const now = Date.now();

        for (const [key, entry] of this.cache.entries()) {
            const age = now - entry.timestamp;
            if (age > entry.ttl) {
                this.cache.delete(key);
            }
        }
    }
}

// Singleton instance
export const authCache = new AuthCache();

// Cache TTLs
export const CACHE_TTL = {
    INSTITUTION_STATUS: 5 * 60 * 1000, // 5 minutes
    USER_PROFILE: 1 * 60 * 1000, // 1 minute
    ROLE_DATA: 2 * 60 * 1000, // 2 minutes
} as const;

// Run garbage collection every 5 minutes
if (typeof window !== 'undefined') {
    setInterval(() => {
        authCache.clearExpired();
    }, 5 * 60 * 1000);
}
