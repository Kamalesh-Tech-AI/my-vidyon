import { StudentLayout } from '@/layouts/StudentLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { NotificationCard } from '@/components/cards/NotificationCard';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/TranslationContext';
import { Bell, Filter, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useNotifications } from '@/hooks/useNotifications';

export function StudentNotifications() {
    const { t } = useTranslation();
    const [filter, setFilter] = useState<string>('all');
    const { notifications, loading } = useNotifications();

    const filteredNotifications = filter === 'all'
        ? notifications
        : notifications.filter(n => n.type === filter || (filter === 'event' && n.source === 'calendar'));

    // Extract unique types for filter + 'all'
    const categories = ['all', ...Array.from(new Set(notifications.map(n => n.type)))];

    return (
        <StudentLayout>
            <PageHeader
                title={t.nav.notifications}
                subtitle={t.dashboard.overview}
                actions={
                    <Button variant="outline" className="flex items-center gap-2">
                        <Bell className="w-4 h-4" />
                        Mark All as Read
                    </Button>
                }
            />

            {/* Filter Buttons */}
            <div className="dashboard-card mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Filter by Category:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                    {categories.map((category) => (
                        <Button
                            key={category}
                            variant={filter === category ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFilter(category)}
                            className={filter === category ? 'bg-primary text-primary-foreground' : ''}
                        >
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : (
                <>
                    {/* Notifications Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredNotifications.map((notification) => (
                            <NotificationCard
                                key={notification.id}
                                title={notification.title}
                                message={notification.message}
                                type={notification.type as any} // Cast comfortably as types are aligned or string
                                time={notification.date}
                                actionUrl={notification.actionUrl}
                            />
                        ))}
                    </div>

                    {filteredNotifications.length === 0 && (
                        <div className="dashboard-card text-center py-12">
                            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">No notifications in this category</p>
                        </div>
                    )}
                </>
            )}
        </StudentLayout>
    );
}
