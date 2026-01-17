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

    /**
     * Initialize real-time connection
     */
    async connect() {
        try {
            console.log('🔌 Connecting to Supabase Realtime...');
            this.isConnected = true;
            console.log('✅ Connected to Supabase Realtime');
            return true;
        } catch (error) {
            console.error('❌ Failed to connect to Supabase Realtime:', error);
            this.isConnected = false;
            return false;
        }
    }

    /**
     * Subscribe to a table's changes
     */
    subscribeToTable(
        tableName: string,
        callback: EventHandler,
        filter?: { event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'; schema?: string }
    ) {
        const channelName = `realtime:${tableName}`;

        // Create channel if it doesn't exist
        if (!this.channels.has(channelName)) {
            const channel = supabase
                .channel(channelName)
                .on(
                    'postgres_changes',
                    {
                        event: filter?.event || '*',
                        schema: filter?.schema || 'public',
                        table: tableName,
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
