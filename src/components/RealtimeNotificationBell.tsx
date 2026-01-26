/**
 * Real-Time Notification Bell
 * Shows live notifications from Supabase Realtime
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
    actionUrl?: string;
}

export function RealtimeNotificationBell() {
    const { subscribeToTable, isConnected } = useWebSocketContext();
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    // Subscribe to leave requests (for institution/admin)
    useEffect(() => {
        if (!user) return;

        let unsubscribeStudentLeaves: () => void = () => { };
        let unsubscribeStaffLeaves: () => void = () => { };

        if (['institution', 'admin'].includes(user.role)) {
            // Subscribe to student leave requests
            unsubscribeStudentLeaves = subscribeToTable('leave_requests', (payload) => {
                console.log('📬 Student Leave request update:', payload);
                if (payload.eventType === 'INSERT') {
                    // Logic for student leaves if needed, or generic
                }
            });

            // Subscribe to STAFF leave requests (for institution/admin to see new requests)
            unsubscribeStaffLeaves = subscribeToTable('staff_leaves', (payload) => {
                console.log('📬 Staff Leave request update:', payload);

                if (payload.eventType === 'INSERT') {
                    const notification: Notification = {
                        id: payload.new.id || Date.now().toString(),
                        title: 'New Staff Leave Request',
                        message: `A staff member has submitted a ${payload.new.leave_type || 'leave'} request`,
                        type: 'info',
                        timestamp: Date.now(),
                        read: false,
                        table: 'staff_leaves',
                        eventType: 'INSERT',
                    };

                    setNotifications(prev => [notification, ...prev].slice(0, 20));
                    setUnreadCount(prev => prev + 1);

                    toast.info(notification.title, {
                        description: notification.message,
                    });
                }
            });
        }

        // For Faculty/Staff: Notify when THEIR leave is approved/rejected
        if (['faculty', 'teacher', 'staff'].includes(user.role)) {
            // Assuming match on staff_id or user_id. We'll try user.id first.
            // Filter: staff_id=eq.${user.id}
            unsubscribeStaffLeaves = subscribeToTable('staff_leaves', (payload) => {
                console.log('📬 Staff Leave Update for User:', payload);
                if (payload.eventType === 'UPDATE' && (payload.new.staff_id === user.id || payload.new.user_id === user.id)) {
                    if (payload.new.status !== payload.old.status) {
                        const notification: Notification = {
                            id: payload.new.id || Date.now().toString(),
                            title: `Leave Request ${payload.new.status}`,
                            message: `Your leave request has been ${payload.new.status.toLowerCase()}`,
                            type: payload.new.status === 'Approved' ? 'success' : 'error',
                            timestamp: Date.now(),
                            read: false,
                            table: 'staff_leaves',
                            eventType: 'UPDATE',
                        };
                        setNotifications(prev => [notification, ...prev].slice(0, 20));
                        setUnreadCount(prev => prev + 1);
                        toast(notification.title, { description: notification.message });
                    }
                }
            });
        }

        return () => {
            if (unsubscribeStudentLeaves) unsubscribeStudentLeaves();
            if (unsubscribeStaffLeaves) unsubscribeStaffLeaves();
        };
    }, [subscribeToTable, user]);

    // Subscribe to Academic Calendar (All Roles)
    useEffect(() => {
        if (!user) return;

        const unsubscribe = subscribeToTable('academic_events', (payload) => {
            console.log('📬 Academic Event update:', payload);
            if (payload.eventType === 'INSERT') {
                const notification: Notification = {
                    id: payload.new.id || Date.now().toString(),
                    title: 'New Academic Event',
                    message: `New event added: ${payload.new.title}`,
                    type: 'info',
                    timestamp: Date.now(),
                    read: false,
                    table: 'academic_events', // Mapped to calendar route
                    eventType: 'INSERT',
                };
                setNotifications(prev => [notification, ...prev].slice(0, 20));
                setUnreadCount(prev => prev + 1);
                toast.info(notification.title, { description: notification.message });
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

    // Subscribe to General Notifications (Targeted at specific user)
    useEffect(() => {
        if (!user) return;

        // Listen for ANY insert into notifications table where user_id matches current user
        // Note: Filters must be cleaner in real service, but RLS + subscribe usually works if policy allows select.
        // However, Supabase Realtime doesn't filter by RLS automatically for the stream generally unless 'pg_changes' is used with filter.
        // We will use filter: `user_id=eq.${user.id}`

        const unsubscribe = subscribeToTable('notifications', (payload) => {
            console.log('📬 Personal Notification update:', payload);

            if (payload.eventType === 'INSERT' && payload.new.user_id === user.id) {
                const notification: Notification = {
                    id: payload.new.id || Date.now().toString(),
                    title: payload.new.title,
                    message: payload.new.message,
                    type: (payload.new.type === 'error' || payload.new.type === 'warning' || payload.new.type === 'success') ? payload.new.type : 'info',
                    timestamp: Date.now(),
                    read: false,
                    table: 'notifications',
                    eventType: 'INSERT',
                    actionUrl: payload.new.action_url,
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


    const navigate = useNavigate();

    const handleNotificationClick = (notification: Notification) => {
        markAsRead(notification.id);

        if (notification.actionUrl) {
            navigate(notification.actionUrl);
            return;
        }

        // Navigation logic based on notification type/table
        if (notification.table === 'staff_leaves') {
            navigate('/institution/leave-approval');
        } else if (notification.table === 'leave_requests') {
            if (user?.role === 'faculty') {
                navigate('/faculty/student-leaves');
            } else {
                navigate('/institution/leave-approval'); // Fallback or distinct route if exists
            }
        } else if (notification.table === 'assignments') {
            navigate(user?.role === 'student' ? '/student/assignments' : '/faculty/assignments');
        } else if (notification.table === 'grades') {
            navigate('/student/grades');
        } else if (notification.table === 'announcements') {
            navigate(user?.role === 'student' ? '/student/notifications' : '/faculty/announcements');
        } else if (notification.table === 'academic_events') {
            // Route to calendar based on role
            if (user?.role === 'institution') navigate('/institution/calendar');
            else if (user?.role === 'student') navigate('/student/calendar');
            else if (user?.role === 'parent') navigate('/parent/calendar');
            else navigate('/faculty/calendar');
        }
    };

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
                                    onClick={() => handleNotificationClick(notification)}
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
