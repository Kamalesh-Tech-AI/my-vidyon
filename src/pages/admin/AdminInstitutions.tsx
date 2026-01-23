import { useState, useEffect } from 'react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { InstitutionCard } from '@/components/cards/InstitutionCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Filter, ChevronDown, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import Loader from '@/components/common/Loader';
import { useMinimumLoadingTime } from '@/hooks/useMinimumLoadingTime';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';

export function AdminInstitutions() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [schoolTypeFilter, setSchoolTypeFilter] = useState<string>('all');

  const { data: institutions = [], isLoading } = useQuery({
    queryKey: ['admin-institutions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('institutions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch counts for each institution
      const institutionsWithCounts = await Promise.all(
        (data || []).map(async (inst) => {
          // Get students count
          const { count: studentsCount } = await supabase
            .from('students')
            .select('id', { count: 'exact', head: true })
            .eq('institution_id', inst.institution_id);

          // Get staff count - check both profiles and staff_details tables
          const [profilesStaffResult, staffDetailsResult] = await Promise.all([
            supabase
              .from('profiles')
              .select('id', { count: 'exact', head: true })
              .eq('institution_id', inst.institution_id)
              .eq('role', 'faculty'),
            supabase
              .from('staff_details')
              .select('id', { count: 'exact', head: true })
              .eq('institution_id', inst.institution_id)
          ]);

          // Use whichever table has more records
          const staffCount = Math.max(
            profilesStaffResult.count || 0,
            staffDetailsResult.count || 0
          );

          return {
            ...inst,
            studentsCount: studentsCount || 0,
            staffCount: staffCount || 0,
          };
        })
      );

      return institutionsWithCounts;
    },
    staleTime: 3 * 60 * 1000, // Data stays fresh for 3 minutes
    gcTime: 10 * 60 * 1000, // Cache persists for 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Use cached data on mount
  });

  // Ensure loader displays for minimum 2 seconds for institutions
  const showLoader = useMinimumLoadingTime(isLoading, 500);

  useEffect(() => {
    const channel = supabase
      .channel('admin-institutions-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'institutions' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-institutions'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-institutions'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-institutions'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_details' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-institutions'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const handleAddInstitution = () => {
    navigate('/admin/add-institution');
  };

  const handleDeleteInstitution = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      try {
        const { error } = await supabase
          .from('institutions')
          .delete()
          .eq('id', id);

        if (error) throw error;
        toast.success('Institution deleted successfully');
        queryClient.invalidateQueries({ queryKey: ['admin-institutions'] });
      } catch (error: any) {
        toast.error('Failed to delete institution: ' + error.message);
      }
    }
  };

  const filteredInstitutions = institutions.filter(inst => {
    // Search filter
    const matchesSearch = inst.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inst.institution_id.toLowerCase().includes(searchTerm.toLowerCase());

    // Status filter
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && inst.status === 'active') ||
      (statusFilter === 'pending' && inst.status === 'pending') ||
      (statusFilter === 'suspended' && (inst.status === 'inactive' || inst.status === 'suspended'));

    // School type filter
    const matchesSchoolType = schoolTypeFilter === 'all' ||
      inst.type?.toLowerCase() === schoolTypeFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesSchoolType;
  });

  const activeInstitutions = filteredInstitutions.filter(i => i.status === 'active');
  const pendingInstitutions = filteredInstitutions.filter(i => i.status === 'pending');
  const suspendedInstitutions = filteredInstitutions.filter(i => i.status === 'inactive' || i.status === 'suspended');

  const hasActiveFilters = statusFilter !== 'all' || schoolTypeFilter !== 'all';

  const clearFilters = () => {
    setStatusFilter('all');
    setSchoolTypeFilter('all');
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Institution Management"
        subtitle="Manage and monitor all registered institutions"
        actions={
          <Button
            className="btn-primary flex items-center gap-2"
            onClick={handleAddInstitution}
          >
            <Plus className="w-4 h-4" />
            Add Institution
          </Button>
        }
      />

      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search institutions..."
            className="input-field pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filter
              {hasActiveFilters && (
                <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {(statusFilter !== 'all' ? 1 : 0) + (schoolTypeFilter !== 'all' ? 1 : 0)}
                </span>
              )}
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Filter Options</DropdownMenuLabel>
            <DropdownMenuSeparator />

            {/* Status Filter */}
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Status</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setStatusFilter('all')} className={statusFilter === 'all' ? 'bg-accent' : ''}>
              <span className="flex-1">All</span>
              {statusFilter === 'all' && <span className="text-primary">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('active')} className={statusFilter === 'active' ? 'bg-accent' : ''}>
              <span className="flex-1">Active</span>
              {statusFilter === 'active' && <span className="text-primary">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('pending')} className={statusFilter === 'pending' ? 'bg-accent' : ''}>
              <span className="flex-1">Pending</span>
              {statusFilter === 'pending' && <span className="text-primary">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('suspended')} className={statusFilter === 'suspended' ? 'bg-accent' : ''}>
              <span className="flex-1">Suspended</span>
              {statusFilter === 'suspended' && <span className="text-primary">✓</span>}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* School Type Filter */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <span className="flex-1">School Type</span>
                {schoolTypeFilter !== 'all' && <span className="text-primary text-xs">({schoolTypeFilter})</span>}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => setSchoolTypeFilter('all')} className={schoolTypeFilter === 'all' ? 'bg-accent' : ''}>
                  <span className="flex-1">All</span>
                  {schoolTypeFilter === 'all' && <span className="text-primary">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSchoolTypeFilter('matriculation')} className={schoolTypeFilter === 'matriculation' ? 'bg-accent' : ''}>
                  <span className="flex-1">Matriculation</span>
                  {schoolTypeFilter === 'matriculation' && <span className="text-primary">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSchoolTypeFilter('higher-secondary')} className={schoolTypeFilter === 'higher-secondary' ? 'bg-accent' : ''}>
                  <span className="flex-1">Higher Secondary</span>
                  {schoolTypeFilter === 'higher-secondary' && <span className="text-primary">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSchoolTypeFilter('cbse')} className={schoolTypeFilter === 'cbse' ? 'bg-accent' : ''}>
                  <span className="flex-1">CBSE</span>
                  {schoolTypeFilter === 'cbse' && <span className="text-primary">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSchoolTypeFilter('state-board')} className={schoolTypeFilter === 'state-board' ? 'bg-accent' : ''}>
                  <span className="flex-1">State Board</span>
                  {schoolTypeFilter === 'state-board' && <span className="text-primary">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSchoolTypeFilter('international')} className={schoolTypeFilter === 'international' ? 'bg-accent' : ''}>
                  <span className="flex-1">International</span>
                  {schoolTypeFilter === 'international' && <span className="text-primary">✓</span>}
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            {hasActiveFilters && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={clearFilters} className="text-destructive focus:text-destructive">
                  <X className="w-4 h-4 mr-2" />
                  Clear All Filters
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {showLoader ? (
        <Loader fullScreen={false} />
      ) : (
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="active">Active ({activeInstitutions.length})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({pendingInstitutions.length})</TabsTrigger>
            <TabsTrigger value="suspended">Suspended ({suspendedInstitutions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {activeInstitutions.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/20">
                <p className="text-muted-foreground">No active institutions found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {activeInstitutions.map((inst) => (
                  <InstitutionCard
                    key={inst.id}
                    id={inst.id}
                    name={inst.name}
                    code={inst.institution_id}
                    location={`${inst.city || ''}${inst.state ? `, ${inst.state}` : ''}`}
                    students={inst.studentsCount || 0}
                    faculty={inst.staffCount || 0}
                    status={inst.status as any}
                    type={inst.type}
                    logoUrl={inst.logo_url}
                    onClick={() => navigate(`/admin/institutions/${inst.institution_id}`)}
                    onEdit={() => navigate(`/admin/add-institution?mode=edit&id=${inst.institution_id}`)}
                    onAnalytics={() => navigate(`/admin/analytics/${inst.institution_id}`)}
                    onDelete={() => handleDeleteInstitution(inst.id, inst.name)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pending">
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground">No pending institutions</p>
            </div>
          </TabsContent>

          <TabsContent value="suspended">
            {suspendedInstitutions.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">No suspended institutions</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {suspendedInstitutions.map((inst) => (
                  <InstitutionCard
                    key={inst.id}
                    id={inst.id}
                    name={inst.name}
                    code={inst.institution_id}
                    location={`${inst.city}, ${inst.state}`}
                    students={inst.studentsCount || 0}
                    faculty={inst.staffCount || 0}
                    status={inst.status as any}
                    type={inst.type}
                    logoUrl={inst.logo_url}
                    onClick={() => navigate(`/admin/institutions/${inst.institution_id}`)}
                    onEdit={() => navigate(`/admin/add-institution?mode=edit&id=${inst.institution_id}`)}
                    onAnalytics={() => navigate(`/admin/analytics/${inst.institution_id}`)}
                    onDelete={() => handleDeleteInstitution(inst.id, inst.name)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </AdminLayout>
  );
}
