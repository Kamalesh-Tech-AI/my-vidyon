import { AdminLayout } from "@/layouts/AdminLayout";
import { Badge } from "@/components/common/Badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, FileText, Clock, CheckCircle2, Megaphone, BarChart3, CreditCard, ArrowLeft, MessageSquare, Loader2, ExternalLink, User, Mail, StickyNote, Building2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";

export function AdminNotifications() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [selectedNotification, setSelectedNotification] = useState<any>(null);

    const { data: notifications, isLoading } = useQuery({
        queryKey: ['admin-notifications', user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        },
        enabled: !!user?.id
    });

    const markAllAsRead = useMutation({
        mutationFn: async () => {
            if (!user?.id) return;
            const { error } = await supabase
                .from('notifications')
                .update({ read: true })
                .eq('user_id', user.id)
                .eq('read', false);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
            toast.success("All notifications marked as read");
        },
        onError: (err: any) => {
            toast.error(err.message || "Failed to mark notifications as read");
        }
    });

    const markAsRead = async (id: string, actionUrl?: string, notification?: any) => {
        await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', id);

        queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });

        if (notification?.type === 'support') {
            setSelectedNotification(notification);
        } else if (actionUrl && actionUrl !== '/admin/notifications') {
            // Check if it's a relative or absolute URL for admin
            navigate(actionUrl);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'support': return <MessageSquare className="w-5 h-5 text-amber-500" />;
            case 'announcement': return <Megaphone className="w-5 h-5 text-purple-500" />;
            case 'institution_request': return <Building2 className="w-5 h-5 text-blue-500" />;
            default: return <Bell className="w-5 h-5 text-primary" />;
        }
    };

    const unreadCount = notifications?.filter(n => !n.read).length || 0;

    return (
        <AdminLayout>
            <PageHeader
                title="Notifications"
                subtitle="Manage support queries and platform alerts"
            />

            <div className="flex flex-col bg-card border rounded-xl shadow-sm h-[calc(100vh-280px)]">
                <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">{notifications?.length || 0} Total</span>
                        {unreadCount > 0 && (
                            <Badge variant="info" className="bg-primary/10 text-primary border-0">
                                {unreadCount} New
                            </Badge>
                        )}
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-8"
                        onClick={() => markAllAsRead.mutate()}
                        disabled={markAllAsRead.isPending || unreadCount === 0}
                    >
                        Mark all as read
                    </Button>
                </div>

                <ScrollArea className="flex-1">
                    <div className="divide-y divide-border">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                                <Loader2 className="w-8 h-8 animate-spin" />
                                <p>Loading notifications...</p>
                            </div>
                        ) : notifications?.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                                <Bell className="w-12 h-12 opacity-20" />
                                <p>No notifications yet</p>
                            </div>
                        ) : (
                            notifications?.map((notification) => (
                                <div
                                    key={notification.id}
                                    onClick={() => markAsRead(notification.id, notification.action_url, notification)}
                                    className={`p-4 transition-all hover:bg-muted/30 cursor-pointer border-l-4 ${!notification.read ? 'border-l-primary bg-primary/5' : 'border-l-transparent'
                                        }`}
                                >
                                    <div className="flex gap-4">
                                        <div className="p-2 rounded-lg bg-background border shadow-sm h-fit">
                                            {getIcon(notification.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className={`text-sm font-semibold truncate ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                    {notification.title}
                                                </h4>
                                                <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                                                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                                </span>
                                            </div>
                                            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                                                {notification.message}
                                            </p>
                                            {notification.type === 'support' && (
                                                <div className="mt-2 flex items-center gap-2 text-xs text-primary font-medium">
                                                    <ExternalLink className="w-3 h-3" />
                                                    Review Request from {notification.metadata?.institution_name || 'Institution'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* Support Detail Modal */}
            <Dialog open={!!selectedNotification} onOpenChange={(open) => !open && setSelectedNotification(null)}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-amber-500" />
                            Support Query Details
                        </DialogTitle>
                        <DialogDescription>
                            From {selectedNotification?.metadata?.institution_name || "Unknown Institution"} •
                            {selectedNotification && formatDistanceToNow(new Date(selectedNotification.created_at), { addSuffix: true })}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedNotification?.metadata && (
                        <div className="space-y-6 py-4">
                            <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg border">
                                <div className="space-y-1">
                                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Contact Person</p>
                                    <div className="flex items-center gap-2 text-sm font-medium">
                                        <User className="w-4 h-4 text-muted-foreground" />
                                        {selectedNotification.metadata.sender_name || "Not provided"}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Sender Email</p>
                                    <div className="flex items-center gap-2 text-sm font-medium">
                                        <Mail className="w-4 h-4 text-muted-foreground" />
                                        {selectedNotification.metadata.sender_email}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                                    <StickyNote className="w-4 h-4 text-primary" />
                                    Subject: {selectedNotification.metadata.subject}
                                </div>
                                <div className="bg-muted/30 p-4 rounded-lg border text-sm whitespace-pre-wrap leading-relaxed italic">
                                    "{selectedNotification.metadata.message}"
                                </div>
                            </div>

                            {selectedNotification.metadata.screenshot_url && (
                                <div className="space-y-2">
                                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold px-1">Attached Screenshot</p>
                                    <div className="relative group overflow-hidden rounded-lg border shadow-sm bg-black">
                                        <img
                                            src={selectedNotification.metadata.screenshot_url}
                                            alt="Problem Screenshot"
                                            className="w-full max-h-[300px] object-contain transition-transform group-hover:scale-[1.02]"
                                        />
                                        <a
                                            href={selectedNotification.metadata.screenshot_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white font-medium gap-2"
                                        >
                                            <ExternalLink className="w-5 h-5" />
                                            View Full Image
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 mt-4">
                        <Button variant="outline" onClick={() => setSelectedNotification(null)}>Close</Button>
                        <Button
                            onClick={() => {
                                window.location.href = `mailto:${selectedNotification?.metadata?.sender_email}?subject=Re: ${selectedNotification?.metadata?.subject}`;
                            }}
                            className="bg-primary hover:bg-primary/90"
                        >
                            Reply via Email
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}
