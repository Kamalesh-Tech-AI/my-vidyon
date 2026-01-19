/**
 * WebSocket Provider (Using Supabase Realtime)
 * Global real-time context using Supabase's built-in realtime functionality
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { realtimeService } from '@/services/realtime.service';
import { toast } from 'sonner';

type RealtimeChannel =
    | 'leave_requests'
    | 'attendance'
    | 'assignments'
    | 'grades'
    | 'payments'
    | 'announcements'
    | 'timetable'
    | 'exam_schedule'
    | 'certificates'
    | 'students'
    | 'staff_details';

interface WebSocketContextType {
    isConnected: boolean;
    subscribe: (channel: RealtimeChannel, callback: (data: any) => void) => () => void;
    subscribeToTable: (tableName: string, callback: (data: any) => void, filter?: { event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'; schema?: string; filter?: string }) => () => void;
    broadcast: (channel: string, event: string, data: any) => Promise<any>;
    connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, user } = useAuth();
    const [isConnected, setIsConnected] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');

    /**
     * Connect to Supabase Realtime when authenticated
     */
    useEffect(() => {
        if (!isAuthenticated || !user) {
            setConnectionStatus('disconnected');
            setIsConnected(false);
            return;
        }

        let mounted = true;

        const connect = async () => {
            try {
                setConnectionStatus('connecting');
                const connected = await realtimeService.connect();

                if (mounted) {
                    setIsConnected(connected);
                    setConnectionStatus(connected ? 'connected' : 'error');
                    if (connected) {
                        console.log('✅ Supabase Realtime connected for user:', user.email);
                        toast.success('Real-time updates enabled', {
                            description: 'You will receive live notifications',
                            duration: 3000,
                        });
                    }
                }
            } catch (error) {
                console.error('❌ Realtime connection failed:', error);
                if (mounted) {
                    setIsConnected(false);
                    setConnectionStatus('error');
                }
            }
        };

        connect();

        return () => {
            mounted = false;
            // Don't disconnect on unmount to maintain connection across route changes
        };
    }, [isAuthenticated, user]);

    /**
     * Subscribe to a specific channel/table
     */
    const subscribe = useCallback((channel: RealtimeChannel, callback: (data: any) => void) => {
        console.log(`📡 Subscribing to ${channel}...`);

        const subscribeMethod = {
            'leave_requests': realtimeService.subscribeToLeaveRequests,
            'attendance': realtimeService.subscribeToAttendance,
            'assignments': realtimeService.subscribeToAssignments,
            'grades': realtimeService.subscribeToGrades,
            'payments': realtimeService.subscribeToPayments,
            'announcements': realtimeService.subscribeToAnnouncements,
            'timetable': realtimeService.subscribeToTimetable,
            'exam_schedule': realtimeService.subscribeToExams,
            'certificates': realtimeService.subscribeToCertificates,
            'students': realtimeService.subscribeToStudents,
            'staff_details': realtimeService.subscribeToStaff,
        }[channel];

        if (subscribeMethod) {
            return subscribeMethod.call(realtimeService, callback);
        }

        return () => { };
    }, []);

    /**
     * Subscribe to any table
     */
    const subscribeToTable = useCallback((tableName: string, callback: (data: any) => void, filter?: { event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'; schema?: string; filter?: string }) => {
        console.log(`📡 Subscribing to table ${tableName}...`, filter);
        return realtimeService.subscribeToTable(tableName, callback, filter);
    }, []);

    /**
     * Broadcast message
     */
    const broadcast = useCallback(async (channel: string, event: string, data: any) => {
        return realtimeService.broadcast(channel, event, data);
    }, []);

    return (
        <WebSocketContext.Provider
            value={{
                isConnected,
                subscribe,
                subscribeToTable,
                broadcast,
                connectionStatus,
            }}
        >
            {children}
        </WebSocketContext.Provider>
    );
}

export function useWebSocketContext() {
    const context = useContext(WebSocketContext);
    if (context === undefined) {
        throw new Error('useWebSocketContext must be used within a WebSocketProvider');
    }
    return context;
}

export default WebSocketProvider;
