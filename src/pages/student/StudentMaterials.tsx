import { useState, useEffect } from 'react';
import { StudentLayout } from '@/layouts/StudentLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/TranslationContext';
import { FileText, Download, Eye, Book, History, Loader2, Calendar } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export function StudentMaterials() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [materials, setMaterials] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [studentClass, setStudentClass] = useState<any>(null);

    useEffect(() => {
        if (user?.institutionId) {
            fetchStudentData();
        }
    }, [user?.institutionId]);

    const fetchStudentData = async () => {
        try {
            setIsLoading(true);

            // 1. Get Student Data (Class & Section)
            const { data: studentData, error: studentError } = await supabase
                .from('students')
                .select('*')
                .eq('id', user?.id)
                .single();

            if (studentError || !studentData) {
                console.warn("Student record not found.", studentError);
                fetchMaterials(null, null);
            } else {
                // Resolve class ID manually since there's no direct FK
                const { data: classData } = await supabase
                    .from('classes')
                    .select(`
                        id, 
                        name,
                        groups!inner(institution_id)
                    `)
                    .eq('name', studentData.class_name)
                    .eq('groups.institution_id', studentData.institution_id)
                    .contains('sections', [studentData.section])
                    .maybeSingle();

                setStudentClass(classData);
                fetchMaterials(classData?.id || null, studentData.section);
                return;
            }
        } catch (error) {
            console.error(error);
            setIsLoading(false);
        }
    };

    const fetchMaterials = async (classId: string | null, section: string | null) => {
        try {
            // Fetch ALL materials for institution to handle complex filtering client-side
            // (e.g. show "All Class 10" materials AND "Class 10 Section A" materials)
            let query = supabase
                .from('learning_resources')
                .select('*, subjects(name)')
                .eq('institution_id', user?.institutionId)
                .order('created_at', { ascending: false });

            const { data, error } = await query;
            if (error) throw error;

            let filteredData = data || [];

            if (classId) {
                filteredData = filteredData.filter(item => {
                    // Rule 1: If the resource has a class_id, it must match the student's classId.
                    // If item.class_id is null, it's considered global/for all classes, so include it.
                    if (item.class_id && item.class_id !== classId) return false;

                    // Rule 2: If the resource has a section, it must match the student's section.
                    // If item.section is null, it's considered for all sections within that class, so include it.
                    if (item.section && item.section !== section) return false;

                    return true;
                });
            }

            setMaterials(filteredData);
        } catch (error) {
            console.error('Error fetching materials:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Filter into buckets
    const studyMaterials = materials.filter(m => m.resource_type === 'study_material');
    const questionPapers = materials.filter(m => m.resource_type === 'question_paper');

    // Group by Subject for Study Materials
    const groupedMaterials = studyMaterials.reduce((acc: any, item) => {
        const subjectName = item.subjects?.name || 'General';
        if (!acc[subjectName]) acc[subjectName] = [];
        acc[subjectName].push(item);
        return acc;
    }, {});

    // Group by Year for Question Papers? 
    // We don't have a "Year" field in schema, just created_at or date provided in title?
    // Let's just list them or group by Subject as well for consistency.
    // Or group by Year if we parse title/date.
    // For now, let's group by Subject just like Materials, simple and effective.
    const groupedPapers = questionPapers.reduce((acc: any, item) => {
        const subjectName = item.subjects?.name || 'General';
        if (!acc[subjectName]) acc[subjectName] = [];
        acc[subjectName].push(item);
        return acc;
    }, {});


    return (
        <StudentLayout>
            <PageHeader
                title={t.nav.materials}
                subtitle={studentClass ? `For Class: ${studentClass.name}` : t.dashboard.overview}
            />

            {isLoading ? (
                <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>
            ) : (
                <Tabs defaultValue="materials" className="w-full">
                    <TabsList className="mb-6">
                        <TabsTrigger value="materials" className="flex items-center gap-2">
                            <Book className="w-4 h-4" />
                            Study Materials
                        </TabsTrigger>
                        <TabsTrigger value="papers" className="flex items-center gap-2">
                            <History className="w-4 h-4" />
                            Previous Year Question Papers
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="materials">
                        {Object.keys(groupedMaterials).length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground">No study materials found for your class.</div>
                        ) : (
                            <div className="space-y-6">
                                {Object.entries(groupedMaterials).map(([subject, items]: [string, any]) => (
                                    <div key={subject} className="dashboard-card">
                                        <h3 className="font-semibold mb-4 text-lg text-primary">{subject}</h3>
                                        <div className="space-y-3">
                                            {items.map((item: any) => (
                                                <div
                                                    key={item.id}
                                                    className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                                            <FileText className="w-5 h-5 text-primary" />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-base">{item.title}</p>
                                                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                                                <Calendar className="w-3 h-3" />
                                                                <span>{new Date(item.created_at).toLocaleDateString()}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            variant="outline" size="sm" className="flex items-center gap-2"
                                                            onClick={() => window.open(item.file_url, '_blank')}
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                            View
                                                        </Button>
                                                        <Button
                                                            variant="outline" size="sm" className="flex items-center gap-2"
                                                            onClick={() => window.open(item.file_url, '_blank')}
                                                        >
                                                            <Download className="w-4 h-4" />
                                                            Download
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="papers">
                        {Object.keys(groupedPapers).length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground">No question papers found for your class.</div>
                        ) : (
                            <div className="space-y-6">
                                {Object.entries(groupedPapers).map(([subject, items]: [string, any]) => (
                                    <div key={subject} className="dashboard-card">
                                        <h3 className="font-semibold mb-4 text-lg text-red-600 dark:text-red-400">{subject}</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {items.map((item: any) => (
                                                <div key={item.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border hover:border-primary/50 transition-colors">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                                                            <FileText className="w-5 h-5 text-red-600 dark:text-red-400" />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium">{item.title}</p>
                                                            <p className="text-sm text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</p>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="ghost" size="icon" className="text-muted-foreground hover:text-primary"
                                                        onClick={() => window.open(item.file_url, '_blank')}
                                                    >
                                                        <Download className="w-5 h-5" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            )}
        </StudentLayout>
    );
}
