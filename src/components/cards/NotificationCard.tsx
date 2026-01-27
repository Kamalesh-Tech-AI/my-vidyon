import { Bell, Info, AlertTriangle, CheckCircle, X, Calendar, BookOpen, Clock, CreditCard, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

import { useNavigate } from 'react-router-dom';

type NotificationType =
  | 'assignment'
  | 'attendance'
  | 'leave'
  | 'announcement'
  | 'exam'
  | 'fees'
  | 'event'
  | 'timetable'
  | 'info'
  | 'warning'
  | 'success'
  | 'error';

interface NotificationCardProps {
  title: string;
  message: string;
  type?: NotificationType;
  time: string;
  read?: boolean;
  onDismiss?: () => void;
  actionUrl?: string;
}

const typeConfig: Record<string, { icon: any, color: string, bg: string }> = {
  info: { icon: Info, color: 'text-info', bg: 'bg-info/10' },
  warning: { icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10' },
  success: { icon: CheckCircle, color: 'text-success', bg: 'bg-success/10' },
  error: { icon: Bell, color: 'text-destructive', bg: 'bg-destructive/10' },
  assignment: { icon: BookOpen, color: 'text-primary', bg: 'bg-primary/10' },
  attendance: { icon: Clock, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  leave: { icon: Calendar, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  announcement: { icon: Bell, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  exam: { icon: BookOpen, color: 'text-red-500', bg: 'bg-red-500/10' },
  fees: { icon: CreditCard, color: 'text-green-500', bg: 'bg-green-500/10' },
  event: { icon: Calendar, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  timetable: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
};

export function NotificationCard({
  title,
  message,
  type = 'info',
  time,
  read = false,
  onDismiss,
  actionUrl,
}: NotificationCardProps) {
  const navigate = useNavigate();
  const config = typeConfig[type] || typeConfig.info;
  const Icon = config.icon;

  const handleClick = () => {
    if (actionUrl) {
      navigate(actionUrl);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border border-border transition-colors touch-active cursor-pointer hover:bg-accent/10',
        read ? 'bg-background' : 'bg-accent/30',
        actionUrl && 'hover:border-primary/30 transition-all shadow-sm active:scale-[0.98]'
      )}>
      <div className={cn('p-2 rounded-lg flex-shrink-0', config.bg)}>
        <Icon className={cn('w-4 h-4', config.color)} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className={cn('font-medium text-sm sm:text-base pr-6', read ? 'text-muted-foreground' : 'text-foreground')}>
            {title}
          </h4>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="absolute top-3 right-3 sm:relative sm:top-0 sm:right-0 p-1 -mr-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors touch-target-sm"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">{message}</p>
        <span className="text-[10px] sm:text-xs text-muted-foreground mt-2 block">{time}</span>
      </div>

      {!read && (
        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
      )}
    </div>
  );
}
