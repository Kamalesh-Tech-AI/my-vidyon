import { BehaviorSubject } from 'rxjs';
import { User } from '@/types/auth';

/**
 * Shared user store using BehaviorSubject pattern
 * Prevents duplicate profile fetches and provides single source of truth
 */
class UserStore {
    private userSubject = new BehaviorSubject<User | null>(null);
    private profileDataCache = new Map<string, any>();

    // Observable for components to subscribe to
    public user$ = this.userSubject.asObservable();

    /**
     * Set the current user
     */
    setUser(user: User | null) {
        this.userSubject.next(user);
    }

    /**
     * Get the current user value
     */
    getUser(): User | null {
        return this.userSubject.value;
    }

    /**
     * Cache profile data to prevent refetching
     */
    cacheProfileData(key: string, data: any) {
        this.profileDataCache.set(key, {
            data,
            timestamp: Date.now(),
        });
    }

    /**
     * Get cached profile data
     * Returns null if cache is expired (> 5 minutes)
     */
    getCachedProfileData(key: string, maxAgeMs: number = 5 * 60 * 1000): any | null {
        const cached = this.profileDataCache.get(key);
        if (!cached) return null;

        const age = Date.now() - cached.timestamp;
        if (age > maxAgeMs) {
            this.profileDataCache.delete(key);
            return null;
        }

        return cached.data;
    }

    /**
     * Clear all cached data
     */
    clearCache() {
        this.profileDataCache.clear();
    }

    /**
     * Clear user and cache on logout
     */
    clear() {
        this.userSubject.next(null);
        this.profileDataCache.clear();
    }
}

export const userStore = new UserStore();
