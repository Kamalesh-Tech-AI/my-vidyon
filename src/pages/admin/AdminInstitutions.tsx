import { useState, useEffect } from 'react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { InstitutionCard } from '@/components/cards/InstitutionCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Filter, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function AdminInstitutions() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: institutions = [], isLoading } = useQuery({
    queryKey: ['admin-institutions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('institutions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });

  useEffect(() => {
    const channel = supabase
      .channel('public:institutions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'institutions' }, () => {
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

  const filteredInstitutions = institutions.filter(inst =>
    inst.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inst.institution_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeInstitutions = filteredInstitutions.filter(i => i.status === 'active');
  const pendingInstitutions = filteredInstitutions.filter(i => i.status === 'pending');
  const suspendedInstitutions = filteredInstitutions.filter(i => i.status === 'inactive' || i.status === 'suspended');

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
        <Button variant="outline" className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Filter
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground font-medium">Loading institutions data...</p>
        </div>
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
                    students={0}
                    faculty={0}
                    status={inst.status as any}
                    type={inst.type}
                    logoUrl={inst.logo_url}
                    onClick={() => navigate(`/admin/institutions/${inst.institution_id}`)}
                    onEdit={() => navigate(`/admin/add-institution?mode=edit&id=${inst.institution_id}`)}
                    onUsers={() => navigate(`/admin/users?institution=${inst.institution_id}`)}
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
                    students={0}
                    faculty={0}
                    status={inst.status as any}
                    type={inst.type}
                    logoUrl={inst.logo_url}
                    onClick={() => navigate(`/admin/institutions/${inst.institution_id}`)}
                    onEdit={() => navigate(`/admin/add-institution?mode=edit&id=${inst.institution_id}`)}
                    onUsers={() => navigate(`/admin/users?institution=${inst.institution_id}`)}
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
