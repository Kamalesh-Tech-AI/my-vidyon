import { Building2, Users, GraduationCap, MapPin, Layers, Eye, Edit, UserCog, BarChart3, Trash2 } from 'lucide-react';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/ui/button';

interface InstitutionCardProps {
  id?: string;
  name: string;
  code: string;
  location: string;
  students: number;
  faculty: number;
  status: 'active' | 'pending' | 'suspended';
  type: string;
  logoUrl?: string; // Add logoUrl support
  classes?: number;
  sections?: number;
  onClick?: () => void;
  onEdit?: () => void;
  onUsers?: () => void;
  onAnalytics?: () => void;
  onDelete?: () => void;
}

export function InstitutionCard({
  id,
  name,
  code,
  location,
  students,
  faculty,
  status,
  type,
  classes,
  sections,
  logoUrl,
  onClick,
  onEdit,
  onUsers,
  onAnalytics,
  onDelete,
}: InstitutionCardProps) {
  const statusVariant = {
    active: 'success',
    pending: 'warning',
    suspended: 'destructive',
  } as const;

  const handleQuickAction = (e: React.MouseEvent, action: string) => {
    e.stopPropagation();

    if (action === 'view' && onClick) {
      onClick();
    } else if (action === 'edit' && onEdit) {
      onEdit();
    } else if (action === 'users' && onUsers) {
      onUsers();
    } else if (action === 'analytics' && onAnalytics) {
      onAnalytics();
    }
  };

  return (
    <div
      className="dashboard-card group cursor-pointer hover:shadow-lg transition-all duration-300 p-4 sm:p-6 touch-active"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
        <div className="p-2 sm:p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors flex-shrink-0 overflow-hidden w-12 h-12 flex items-center justify-center">
          {logoUrl ? (
            <img src={logoUrl} alt={name} className="w-full h-full object-contain" />
          ) : (
            <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
          )}
        </div>
        <Badge variant={statusVariant[status]}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
      </div>

      <h3 className="font-semibold text-sm sm:text-base text-foreground mb-1 group-hover:text-primary transition-colors line-clamp-2">
        {name}
      </h3>
      <p className="text-xs sm:text-sm text-muted-foreground mb-1">{code}</p>
      <p className="text-[10px] sm:text-xs text-muted-foreground mb-3 sm:mb-4">{type}</p>

      <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
        <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
        <span className="line-clamp-1 truncate">{location}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-3 sm:pt-4 pb-3 sm:pb-4 border-t border-b border-border">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-info flex-shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-xs sm:text-sm font-semibold text-foreground">{students.toLocaleString()}</span>
            <span className="text-[10px] sm:text-xs text-muted-foreground">Students</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-success flex-shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-xs sm:text-sm font-semibold text-foreground">{faculty}</span>
            <span className="text-[10px] sm:text-xs text-muted-foreground">Staff</span>
          </div>
        </div>
        {classes && sections && (
          <>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-warning flex-shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-xs sm:text-sm font-semibold text-foreground">{classes}</span>
                <span className="text-[10px] sm:text-xs text-muted-foreground">Classes</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-xs sm:text-sm font-semibold text-foreground">{sections}</span>
                <span className="text-[10px] sm:text-xs text-muted-foreground">Sections</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mt-3 sm:mt-4">
        <Button
          variant="outline"
          size="sm"
          className="text-[10px] sm:text-xs min-h-[36px] sm:min-h-[32px]"
          onClick={(e) => handleQuickAction(e, 'view')}
        >
          <Eye className="w-3 h-3 mr-1" />
          View
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-[10px] sm:text-xs min-h-[36px] sm:min-h-[32px]"
          onClick={(e) => handleQuickAction(e, 'edit')}
        >
          <Edit className="w-3 h-3 mr-1" />
          Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-[10px] sm:text-xs min-h-[36px] sm:min-h-[32px]"
          onClick={(e) => handleQuickAction(e, 'users')}
        >
          <UserCog className="w-3 h-3 mr-1" />
          Users
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-[10px] sm:text-xs min-h-[36px] sm:min-h-[32px]"
          onClick={(e) => handleQuickAction(e, 'analytics')}
        >
          <BarChart3 className="w-3 h-3 mr-1" />
          Analytics
        </Button>
        {onDelete && (
          <Button
            variant="outline"
            size="sm"
            className="text-[10px] sm:text-xs min-h-[36px] sm:min-h-[32px] text-destructive hover:bg-destructive/10 border-destructive/20"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}
