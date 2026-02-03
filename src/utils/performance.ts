/**
 * Performance monitoring utilities
 * Track page load times, API call durations, and component render times
 */

interface PerformanceMetric {
    name: string;
    duration: number;
    timestamp: number;
    metadata?: Record<string, any>;
}

class PerformanceMonitor {
    private metrics: PerformanceMetric[] = [];
    private marks = new Map<string, number>();

    /**
     * Start timing a specific operation
     */
    mark(name: string, metadata?: Record<string, any>) {
        const timestamp = performance.now();
        this.marks.set(name, timestamp);

        if (process.env.NODE_ENV === 'development') {
            console.log(`⏱️ [PERF] Started: ${name}`, metadata);
        }
    }

    /**
     * End timing and record metric
     */
    measure(name: string, metadata?: Record<string, any>) {
        const endTime = performance.now();
        const startTime = this.marks.get(name);

        if (!startTime) {
            console.warn(`⚠️ [PERF] No start mark found for: ${name}`);
            return;
        }

        const duration = endTime - startTime;
        const metric: PerformanceMetric = {
            name,
            duration,
            timestamp: endTime,
            metadata,
        };

        this.metrics.push(metric);
        this.marks.delete(name);

        // Log in development
        if (process.env.NODE_ENV === 'development') {
            const durationStr = duration.toFixed(2);
            const emoji = duration > 3000 ? '🐌' : duration > 1000 ? '⚠️' : '✅';
            console.log(`${emoji} [PERF] ${name}: ${durationStr}ms`, metadata);
        }

        // Warn on slow operations
        if (duration > 3000) {
            console.warn(`🐌 [PERF] SLOW OPERATION: ${name} took ${duration.toFixed(2)}ms`);
        }

        return metric;
    }

    /**
     * Get all recorded metrics
     */
    getMetrics(): PerformanceMetric[] {
        return [...this.metrics];
    }

    /**
     * Get metrics for a specific operation
     */
    getMetricsByName(name: string): PerformanceMetric[] {
        return this.metrics.filter(m => m.name === name);
    }

    /**
     * Get average duration for an operation
     */
    getAverageDuration(name: string): number {
        const metrics = this.getMetricsByName(name);
        if (metrics.length === 0) return 0;

        const total = metrics.reduce((sum, m) => sum + m.duration, 0);
        return total / metrics.length;
    }

    /**
     * Clear all metrics
     */
    clear() {
        this.metrics = [];
        this.marks.clear();
    }

    /**
     * Export metrics as JSON
     */
    export(): string {
        return JSON.stringify(this.metrics, null, 2);
    }

    /**
     * Track navigation timing
     */
    trackNavigation() {
        if (typeof window === 'undefined' || !window.performance) return;

        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (!navigation) return;

        const metrics = {
            'DNS Lookup': navigation.domainLookupEnd - navigation.domainLookupStart,
            'TCP Connection': navigation.connectEnd - navigation.connectStart,
            'Request': navigation.responseStart - navigation.requestStart,
            'Response': navigation.responseEnd - navigation.responseStart,
            'DOM Processing': navigation.domInteractive - navigation.responseEnd,
            'DOM Content Loaded': navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            'Load Event': navigation.loadEventEnd - navigation.loadEventStart,
            'Total Load Time': navigation.loadEventEnd - navigation.fetchStart,
        };

        if (process.env.NODE_ENV === 'development') {
            console.log('📊 [PERF] Navigation Timing:');
            Object.entries(metrics).forEach(([name, duration]) => {
                console.log(`  ${name}: ${duration.toFixed(2)}ms`);
            });
        }

        return metrics;
    }

    /**
     * Track API call
     */
    trackApiCall(endpoint: string, method: string = 'GET') {
        const markName = `api_${method}_${endpoint}`;
        this.mark(markName, { endpoint, method });

        return () => {
            this.measure(markName, { endpoint, method });
        };
    }

    /**
     * Track component render
     */
    trackComponentRender(componentName: string) {
        this.mark(`render_${componentName}`, { component: componentName });

        return () => {
            this.measure(`render_${componentName}`, { component: componentName });
        };
    }
}

export const performanceMonitor = new PerformanceMonitor();

// Auto-track navigation on page load
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        setTimeout(() => {
            performanceMonitor.trackNavigation();
        }, 0);
    });
}

/**
 * Helper function to wrap async operations with performance tracking
 */
export async function trackAsync<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
): Promise<T> {
    performanceMonitor.mark(name, metadata);
    try {
        const result = await fn();
        performanceMonitor.measure(name, metadata);
        return result;
    } catch (error) {
        performanceMonitor.measure(name, { ...metadata, error: true });
        throw error;
    }
}
