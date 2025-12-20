import { FacultyLayout } from '@/layouts/FacultyLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { FileText, Upload, Eye, Download, Calendar } from 'lucide-react';

const examPapers = [
    { id: 1, title: 'Term 2 Final Exam', subject: 'Mathematics', class: 'Grade 10', date: 'Dec 22, 2025', status: 'ready' },
    { id: 2, title: 'Unit Test - II', subject: 'Science', class: 'Grade 9', date: 'Dec 15, 2025', status: 'archived' },
    { id: 3, title: 'Half Yearly Examination', subject: 'English', class: 'Grade 10', date: 'Oct 10, 2025', status: 'archived' },
];

export function FacultyExams() {
    return (
        <FacultyLayout>
            <PageHeader
                title="Exam Papers"
                subtitle="Manage and upload examination question papers"
                actions={
                    <Button className="btn-primary flex items-center gap-2">
                        <Upload className="w-4 h-4" />
                        Upload New Paper
                    </Button>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {examPapers.map((paper) => (
                    <div key={paper.id} className="dashboard-card group">
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 bg-primary/10 rounded-xl">
                                <FileText className="w-6 h-6 text-primary" />
                            </div>
                            <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${paper.status === 'ready' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                                }`}>
                                {paper.status}
                            </div>
                        </div>

                        <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors">{paper.title}</h3>
                        <p className="text-sm text-muted-foreground mb-4">{paper.subject} • {paper.class}</p>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Exam Date: {paper.date}</span>
                        </div>

                        <div className="flex items-center gap-2 pt-4 border-t border-border">
                            <Button variant="outline" size="sm" className="flex-1 gap-2">
                                <Eye className="w-4 h-4" />
                                Preview
                            </Button>
                            <Button variant="outline" size="sm" className="flex-1 gap-2">
                                <Download className="w-4 h-4" />
                                Download
                            </Button>
                        </div>
                    </div>
                ))}

                {/* Upload Card */}
                <div className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center text-center hover:border-primary hover:bg-primary/5 transition-all cursor-pointer">
                    <div className="p-4 bg-muted rounded-full mb-4">
                        <Upload className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h4 className="font-semibold mb-1">Upload Exam Paper</h4>
                    <p className="text-xs text-muted-foreground max-w-[200px]">PDF, Word or Excel files accepted (Max 10MB)</p>
                </div>
            </div>
        </FacultyLayout>
    );
}
