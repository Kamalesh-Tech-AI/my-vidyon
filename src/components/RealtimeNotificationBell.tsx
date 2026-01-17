/**
 * Real-Time Notification Bell
 * Shows live notifications from Supabase Realtime
 */

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useWebSocketContext } from '@/context/WebSocketContext';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/context/AuthContext';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    timestamp: number;
    read: boolean;
    table?: string;
    eventType?: string;
}

export function RealtimeNotificationBell() {
    const { subscribeToTable, isConnected } = useWebSocketContext();
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    // Subscribe to leave requests (for institution/admin)
    useEffect(() => {
        if (!user || !['institution', 'admin'].includes(user.role)) return;

        const unsubscribe = subscribeToTable('leave_requests', (payload) => {
            console.log('📬 Leave request update:', payload);

            if (payload.eventType === 'INSERT') {
                const notification: Notification = {
                    id: payload.new.id || Date.now().toString(),
                    title: 'New Leave Request',
                    message: `${payload.new.staff_name || 'A staff member'} has submitted a leave request`,
                    type: 'info',
                    timestamp: Date.now(),
                    read: false,
                    table: 'leave_requests',
                    eventType: 'INSERT',
                };

                setNotifications(prev => [notification, ...prev].slice(0, 20));
                setUnreadCount(prev => prev + 1);

                toast.info(notification.title, {
                    description: notification.message,
                });
            }
        });

        return unsubscribe;
    }, [subscribeToTable, user]);

    // Subscribe to assignments (for students/faculty)
    useEffect(() => {
        if (!user) return;

        const unsubscribe = subscribeToTable('assignments', (payload) => {
            console.log('📬 Assignment update:', payload);

            if (payload.eventType === 'INSERT' && user.role === 'student') {
                const notification: Notification = {
                    id: payload.new.id || Date.now().toString(),
                    title: 'New Assignment',
                    message: `${payload.new.title || 'An assignment'} has been posted`,
                    type: 'info',
                    timestamp: Date.now(),
                    read: false,
                    table: 'assignments',
                    eventType: 'INSERT',
                };

                setNotifications(prev => [notification, ...prev].slice(0, 20));
                setUnreadCount(prev => prev + 1);

                toast.info(notification.title, {
                    description: notification.message,
                });
            }
        });

        return unsubscribe;
    }, [subscribeToTable, user]);

    // Subscribe to attendance (for students/parents)
    useEffect(() => {
        if (!user || !['student', 'parent'].includes(user.role)) return;

        const unsubscribe = subscribeToTable('attendance', (payload) => {
            console.log('📬 Attendance update:', payload);

            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                const notification: Notification = {
                    id: payload.new.id || Date.now().toString(),
                    title: 'Attendance Updated',
                    message: `Your attendance has been marked as ${payload.new.status || 'updated'}`,
                    type: payload.new.status === 'present' ? 'success' : 'warning',
                    timestamp: Date.now(),
                    read: false,
                    table: 'attendance',
                    eventType: payload.eventType,
                };

                setNotifications(prev => [notification, ...prev].slice(0, 20));
                setUnreadCount(prev => prev + 1);

                toast(notification.title, {
                    description: notification.message,
                });
            }
        });

        return unsubscribe;
    }, [subscribeToTable, user]);

    // Subscribe to grades (for students/parents)
    useEffect(() => {
        if (!user || !['student', 'parent'].includes(user.role)) return;

        const unsubscribe = subscribeToTable('grades', (payload) => {
            console.log('📬 Grade update:', payload);

            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                const notification: Notification = {
                    id: payload.new.id || Date.now().toString(),
                    title: 'Grade Posted',
                    message: `New grade has been posted`,
                    type: 'success',
                    timestamp: Date.now(),
                    read: false,
                    table: 'grades',
                    eventType: payload.eventType,
                };

                setNotifications(prev => [notification, ...prev].slice(0, 20));
                setUnreadCount(prev => prev + 1);

                toast.success(notification.title, {
                    description: notification.message,
                });
            }
        });

        return unsubscribe;
    }, [subscribeToTable, user]);

    // Subscribe to announcements (for all)
    useEffect(() => {
        if (!user) return;

        const unsubscribe = subscribeToTable('announcements', (payload) => {
            console.log('📬 Announcement update:', payload);

            if (payload.eventType === 'INSERT') {
                const notification: Notification = {
                    id: payload.new.id || Date.now().toString(),
                    title: 'New Announcement',
                    message: payload.new.title || 'A new announcement has been posted',
                    type: 'info',
                    timestamp: Date.now(),
                    read: false,
                    table: 'announcements',
                    eventType: 'INSERT',
                };

                setNotifications(prev => [notification, ...prev].slice(0, 20));
                setUnreadCount(prev => prev + 1);

                toast.info(notification.title, {
                    description: notification.message,
                });
            }
        });

        return unsubscribe;
    }, [subscribeToTable, user]);

    // Subscribe to exam schedule (for students/faculty)
    useEffect(() => {
        if (!user || !['student', 'faculty'].includes(user.role)) return;

        const unsubscribe = subscribeToTable('exam_schedule', (payload) => {
            console.log('📬 Exam schedule update:', payload);

            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                const notification: Notification = {
                    id: payload.new.id || Date.now().toString(),
                    title: 'Exam Schedule Updated',
                    message: `Exam schedule has been ${payload.eventType === 'INSERT' ? 'posted' : 'updated'}`,
                    type: 'warning',
                    timestamp: Date.now(),
                    read: false,
                    table: 'exam_schedule',
                    eventType: payload.eventType,
                };

                setNotifications(prev => [notification, ...prev].slice(0, 20));
                setUnreadCount(prev => prev + 1);

                toast.warning(notification.title, {
                    description: notification.message,
                });
            }
        });

        return unsubscribe;
    }, [subscribeToTable, user]);

    const markAsRead = (id: string) => {
        setNotifications(prev =>
            prev.map(n => (n.id === id ? { ...n, read: true } : n))
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
    };

    const clearAll = () => {
        setNotifications([]);
        setUnreadCount(0);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                        >
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </Badge>
                    )}
                    {!isConnected && (
                        <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-yellow-500" />
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Notifications</span>
                    {isConnected ? (
                        <Badge variant="outline" className="text-xs">
                            <span className="h-2 w-2 rounded-full bg-green-500 mr-1 animate-pulse" />
                            Live
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="text-xs">
                            <span className="h-2 w-2 rounded-full bg-yellow-500 mr-1" />
                            Offline
                        </Badge>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {notifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                        No notifications yet
                    </div>
                ) : (
                    <>
                        <div className="max-h-96 overflow-y-auto">
                            {notifications.map((notification) => (
                                <DropdownMenuItem
                                    key={notification.id}
                                    className={`flex flex-col items-start p-3 cursor-pointer ${!notification.read ? 'bg-muted/50' : ''
                                        }`}
                                    onClick={() => markAsRead(notification.id)}
                                >
                                    <div className="flex items-start justify-between w-full">
                                        <div className="flex-1">
                                            <p className="font-medium text-sm">{notification.title}</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {notification.message}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                                            </p>
                                        </div>
                                        {!notification.read && (
                                            <span className="h-2 w-2 rounded-full bg-blue-500 ml-2 mt-1" />
                                        )}
                                    </div>
                                </DropdownMenuItem>
                            ))}
                        </div>
                        <DropdownMenuSeparator />
                        <div className="flex gap-2 p-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 text-xs"
                                onClick={markAllAsRead}
                            >
                                Mark all read
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 text-xs"
                                onClick={clearAll}
                            >
                                Clear all
                            </Button>
                        </div>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default RealtimeNotificationBell;
