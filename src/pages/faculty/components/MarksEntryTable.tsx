import { DataTable } from '@/components/common/DataTable';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/common/Badge';
import { cn } from '@/lib/utils';

interface MarksEntryTableProps {
    studentsData: any[];
    marksData: Record<string, { internal: number, external: number, id?: string, status?: string }>;
    handleMarkChange: (studentId: string, field: 'internal' | 'external', value: string) => void;
    viewMode: 'ENTRY' | 'REVIEW' | 'CLASS_TEACHER';
    validationErrors: Record<string, { internal?: boolean, external?: boolean }>;
    isLoading: boolean;
    searchTerm: string;
}

export function MarksEntryTable({
    studentsData,
    marksData,
    handleMarkChange,
    viewMode,
    validationErrors,
    isLoading,
    searchTerm
}: MarksEntryTableProps) {
    const columns = [
        { key: 'register_number', header: 'Register No' },
        { key: 'name', header: 'Student Name' },
        {
            key: 'internal',
            header: 'Internal (20)',
            render: (s: any) => (
                <div className="space-y-1">
                    <Input
                        type="number"
                        value={marksData[s.id]?.internal ?? ''}
                        onChange={(e) => handleMarkChange(s.id, 'internal', e.target.value)}
                        disabled={viewMode === 'REVIEW' || marksData[s.id]?.status === 'SUBMITTED'}
                        className={cn(
                            "w-20 bg-background transition-all",
                            validationErrors[s.id]?.internal ? "border-destructive focus-visible:ring-destructive" : ""
                        )}
                    />
                    {validationErrors[s.id]?.internal && <span className="text-[10px] text-destructive font-medium">Max 20</span>}
                </div>
            )
        },
        {
            key: 'external',
            header: 'External (80)',
            render: (s: any) => (
                <div className="space-y-1">
                    <Input
                        type="number"
                        value={marksData[s.id]?.external ?? ''}
                        onChange={(e) => handleMarkChange(s.id, 'external', e.target.value)}
                        disabled={viewMode === 'REVIEW' || marksData[s.id]?.status === 'SUBMITTED'}
                        className={cn(
                            "w-20 bg-background transition-all",
                            validationErrors[s.id]?.external ? "border-destructive focus-visible:ring-destructive" : ""
                        )}
                    />
                    {validationErrors[s.id]?.external && <span className="text-[10px] text-destructive font-medium">Max 80</span>}
                </div>
            )
        },
        {
            key: 'total',
            header: 'Total (100)',
            render: (s: any) => {
                const total = (marksData[s.id]?.internal || 0) + (marksData[s.id]?.external || 0);
                const hasError = validationErrors[s.id]?.internal || validationErrors[s.id]?.external;
                return (
                    <span className={cn(
                        "font-bold text-lg",
                        hasError ? "text-destructive" : "text-primary",
                        total < 35 ? "text-warning" : "" // Subtle indication if failing
                    )}>
                        {total}
                    </span>
                );
            }
        },
        {
            key: 'status',
            header: 'Status',
            render: (s: any) => (
                <Badge variant={marksData[s.id]?.status === 'SUBMITTED' ? 'info' : marksData[s.id]?.status === 'PUBLISHED' ? 'success' : 'outline'}>
                    {marksData[s.id]?.status || 'DRAFT'}
                </Badge>
            )
        }
    ];

    return (
        <DataTable
            columns={columns}
            data={studentsData.filter((s: any) => s.name.toLowerCase().includes(searchTerm.toLowerCase()))}
            loading={isLoading}
        />
    );
}
