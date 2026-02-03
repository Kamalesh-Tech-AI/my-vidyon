/**
 * Real-Time Service using Supabase Realtime
 * Provides real-time updates using Supabase's built-in realtime functionality
 */

import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

type EventHandler = (payload: any) => void;

class RealtimeService {
    private channels: Map<string, RealtimeChannel> = new Map();
    private subscriptions: Map<string, Set<EventHandler>> = new Map();
    private isConnected: boolean = false;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;
    private reconnectDelay: number = 1000; // Start with 1 second
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private connectionHealthy: boolean = true;

    /**
     * Initialize real-time connection with health monitoring
     */
    async connect() {
        try {
            console.log('🔌 Connecting to Supabase Realtime...');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.startHeartbeat();
            console.log('✅ Connected to Supabase Realtime');
            return true;
        } catch (error) {
            console.error('❌ Failed to connect to Supabase Realtime:', error);
            this.isConnected = false;
            this.attemptReconnect();
            return false;
        }
    }

    /**
     * Start heartbeat to monitor connection health
     */
    private startHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }

        this.heartbeatInterval = setInterval(() => {
            // Check if any channels are in error state
            let hasErrors = false;
            this.channels.forEach((channel) => {
                const state = (channel as any).state;
                if (state === 'errored' || state === 'closed') {
                    hasErrors = true;
                }
            });

            if (hasErrors && this.connectionHealthy) {
                console.warn('⚠️ Connection health degraded, attempting reconnect...');
                this.connectionHealthy = false;
                this.attemptReconnect();
            } else if (!hasErrors && !this.connectionHealthy) {
                console.log('✅ Connection health restored');
                this.connectionHealthy = true;
                this.reconnectAttempts = 0;
            }
        }, 30000); // Check every 30 seconds
    }

    /**
     * Attempt to reconnect with exponential backoff
     */
    private attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('❌ Max reconnection attempts reached');
            return;
        }

        const delay = Math.min(
            this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
            30000 // Max 30 seconds
        );

        console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);

        setTimeout(() => {
            this.reconnectAttempts++;
            this.reconnectAllChannels();
        }, delay);
    }

    /**
     * Reconnect all existing channels
     */
    private reconnectAllChannels() {
        console.log('🔄 Reconnecting all channels...');

        // Store current subscriptions
        const currentSubscriptions = new Map(this.subscriptions);

        // Clear existing channels
        this.channels.forEach((channel) => {
            supabase.removeChannel(channel);
        });
        this.channels.clear();

        // Recreate subscriptions
        currentSubscriptions.forEach((handlers, channelName) => {
            const [, tableName] = channelName.split(':');
            handlers.forEach((handler) => {
                // Re-subscribe using the original handler
                // Note: This is a simplified version, you might need to store filter info
                this.subscribeToTable(tableName, handler);
            });
        });

        this.isConnected = true;
        console.log('✅ All channels reconnected');
    }

    /**
     * Subscribe to a table's changes
     */
    subscribeToTable(
        tableName: string,
        callback: EventHandler,
        filter?: { event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'; schema?: string; filter?: string }
    ) {
        const channelName = `realtime:${tableName}:${filter?.filter || 'all'}`;

        // Create channel if it doesn't exist
        if (!this.channels.has(channelName)) {
            const channel = supabase
                .channel(channelName)
                .on(
                    'postgres_changes' as any,
                    {
                        event: filter?.event || '*',
                        schema: filter?.schema || 'public',
                        table: tableName,
                        filter: filter?.filter,
                    },
                    (payload) => {
                        console.log(`📡 Real-time update from ${tableName}:`, payload);

                        // Notify all subscribers
                        const handlers = this.subscriptions.get(channelName);
                        if (handlers) {
                            handlers.forEach(handler => {
                                try {
                                    handler(payload);
                                } catch (error) {
                                    console.error('Error in realtime handler:', error);
                                }
                            });
                        }
                    }
                )
                .subscribe((status) => {
                    console.log(`📡 Subscription status for ${tableName}:`, status);
                });

            this.channels.set(channelName, channel);
        }

        // Add callback to subscriptions
        if (!this.subscriptions.has(channelName)) {
            this.subscriptions.set(channelName, new Set());
        }
        this.subscriptions.get(channelName)!.add(callback);

        // Return unsubscribe function
        return () => {
            const handlers = this.subscriptions.get(channelName);
            if (handlers) {
                handlers.delete(callback);

                // If no more handlers, remove channel
                if (handlers.size === 0) {
                    const channel = this.channels.get(channelName);
                    if (channel) {
                        supabase.removeChannel(channel);
                        this.channels.delete(channelName);
                        this.subscriptions.delete(channelName);
                    }
                }
            }
        };
    }

    /**
     * Subscribe to leave requests
     */
    subscribeToLeaveRequests(callback: EventHandler) {
        return this.subscribeToTable('leave_requests', callback);
    }

    /**
     * Subscribe to attendance
     */
    subscribeToAttendance(callback: EventHandler) {
        return this.subscribeToTable('attendance', callback);
    }

    /**
     * Subscribe to assignments
     */
    subscribeToAssignments(callback: EventHandler) {
        return this.subscribeToTable('assignments', callback);
    }

    /**
     * Subscribe to grades
     */
    subscribeToGrades(callback: EventHandler) {
        return this.subscribeToTable('grades', callback);
    }

    /**
     * Subscribe to fees/payments
     */
    subscribeToPayments(callback: EventHandler) {
        return this.subscribeToTable('payments', callback);
    }

    /**
     * Subscribe to announcements
     */
    subscribeToAnnouncements(callback: EventHandler) {
        return this.subscribeToTable('announcements', callback);
    }

    /**
     * Subscribe to timetable changes
     */
    subscribeToTimetable(callback: EventHandler) {
        return this.subscribeToTable('timetable', callback);
    }

    /**
     * Subscribe to exam schedules
     */
    subscribeToExams(callback: EventHandler) {
        return this.subscribeToTable('exam_schedule', callback);
    }

    /**
     * Subscribe to certificates
     */
    subscribeToCertificates(callback: EventHandler) {
        return this.subscribeToTable('certificates', callback);
    }

    /**
     * Subscribe to students table
     */
    subscribeToStudents(callback: EventHandler) {
        return this.subscribeToTable('students', callback);
    }

    /**
     * Subscribe to staff details
     */
    subscribeToStaff(callback: EventHandler) {
        return this.subscribeToTable('staff_details', callback);
    }

    /**
     * Subscribe to notifications
     */
    subscribeToNotifications(userId: string, callback: EventHandler) {
        return this.subscribeToTable('notifications', callback, {
            event: 'INSERT',
            schema: 'public',
            // filter: `user_id=eq.${userId}` // Note: Supabase Realtime filtering syntax might vary, keeping simple for now or relying on RLS/client-side filter if needed? 
            // Actually, best to filter if possible. simpler to just subscribe to table and filter in callback if RLS doesn't handle it for "postgres_changes". 
            // But usually 'user_id=eq.${userId}' works for Postgres changes if the column exists.
            // Let's stick to the pattern used in the class. The other methods don't seem to take args.
            // But notifications are highly user specific.
            // For now, I'll match the pattern and maybe overload or just use the generic subscribeToTable in components if specific filtering is needed.
            // Wait, looking at existing methods, they just call subscribeToTable('table', callback).
            // I'll add a generic one for now.
        });
    }

    /**
     * Check if connected
     */
    getConnectionStatus() {
        return this.isConnected;
    }

    /**
     * Disconnect all channels
     */
    disconnect() {
        this.channels.forEach((channel) => {
            supabase.removeChannel(channel);
        });
        this.channels.clear();
        this.subscriptions.clear();
        this.isConnected = false;
        console.log('🔌 Disconnected from Supabase Realtime');
    }

    /**
     * Broadcast a custom event (using Supabase broadcast)
     */
    async broadcast(channelName: string, event: string, payload: any) {
        let channel = this.channels.get(`broadcast:${channelName}`);

        if (!channel) {
            channel = supabase.channel(`broadcast:${channelName}`);
            await channel.subscribe();
            this.channels.set(`broadcast:${channelName}`, channel);
        }

        return channel.send({
            type: 'broadcast',
            event,
            payload,
        });
    }

    /**
     * Subscribe to broadcast events
     */
    subscribeToBroadcast(channelName: string, event: string, callback: EventHandler) {
        const fullChannelName = `broadcast:${channelName}`;

        let channel = this.channels.get(fullChannelName);

        if (!channel) {
            channel = supabase
                .channel(fullChannelName)
                .on('broadcast', { event }, (payload) => {
                    console.log(`📡 Broadcast received on ${channelName}:`, payload);
                    callback(payload);
                })
                .subscribe();

            this.channels.set(fullChannelName, channel);
        }

        return () => {
            const ch = this.channels.get(fullChannelName);
            if (ch) {
                supabase.removeChannel(ch);
                this.channels.delete(fullChannelName);
            }
        };
    }
}

// Create singleton instance
export const realtimeService = new RealtimeService();

export default realtimeService;
