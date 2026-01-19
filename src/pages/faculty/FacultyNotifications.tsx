import { FacultyLayout } from '@/layouts/FacultyLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { NotificationPanel } from '@/components/notifications/NotificationPanel';

export function FacultyNotifications() {
    return (
        <FacultyLayout>
            <PageHeader
                title="Notifications"
                subtitle="View your alerts and academic calendar updates"
            />

            <div className="max-w-4xl bg-white rounded-xl border border-border shadow-sm min-h-[600px] overflow-hidden">
                <NotificationPanel />
            </div>
        </FacultyLayout>
    );
}
