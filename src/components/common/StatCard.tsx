import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  iconColor?: string;
  className?: string;
  onClick?: () => void;
}

export function StatCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  iconColor = 'text-primary',
  className,
  onClick,
}: StatCardProps) {
  return (
    <div
      className={cn('stat-card animate-fade-in p-4 sm:p-6', className)}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
          <p className="text-xs sm:text-sm text-muted-foreground truncate">{title}</p>
          <p className="text-xl sm:text-2xl font-semibold">{value}</p>
        </div>
        <div className={cn(
          'p-2 sm:p-2.5 rounded-lg flex-shrink-0',
          iconColor.replace('text-', 'bg-') + '/10'
        )}>
          <Icon className={cn('w-4 h-4 sm:w-5 sm:h-5', iconColor)} />
        </div>
      </div>
      {change && (
        <p className={cn(
          'text-xs sm:text-sm mt-2 truncate',
          changeType === 'positive' && 'text-success',
          changeType === 'negative' && 'text-destructive',
          changeType === 'neutral' && 'text-muted-foreground'
        )}>
          {change}
        </p>
      )}
    </div>
  );
}

