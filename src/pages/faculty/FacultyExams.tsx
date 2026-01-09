import { useState } from 'react';
import { FacultyLayout } from '@/layouts/FacultyLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { FileText, Upload, Eye, Download, Calendar } from 'lucide-react';

const initialMaterials = [
    { id: 1, title: 'Term 2 Final Exam', subject: 'Mathematics', class: 'Grade 10', date: 'Dec 22, 2025', status: 'ready', type: 'exam' },
    { id: 2, title: 'Unit Test - II', subject: 'Science', class: 'Grade 9', date: 'Dec 15, 2025', status: 'archived', type: 'exam' },
    { id: 3, title: 'Chapter 5 Notes', subject: 'English', class: 'Grade 10', date: 'Oct 10, 2025', status: 'ready', type: 'study-material' },
    { id: 4, title: 'Lab Manual', subject: 'Physics', class: 'Grade 11', date: 'Sept 1, 2025', status: 'ready', type: 'study-material' },
];

export function FacultyExams() {
    const [materials, setMaterials] = useState(initialMaterials);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [materialType, setMaterialType] = useState<'exam' | 'study-material'>('exam');
    const [newMaterial, setNewMaterial] = useState({
        title: '',
        subject: '',
        class: 'Grade 10',
        date: ''
    });

    const handleAddMaterial = () => {
        if (!newMaterial.title || !newMaterial.subject || !newMaterial.date) return;

        const material = {
            id: Math.max(...materials.map(p => p.id), 0) + 1,
            title: newMaterial.title,
            subject: newMaterial.subject,
            class: newMaterial.class,
            date: new Date(newMaterial.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            status: 'ready',
            type: materialType
        };

        setMaterials([material, ...materials]);
        setIsDialogOpen(false);
        setNewMaterial({ title: '', subject: '', class: 'Grade 10', date: '' });
    };

    const filteredMaterials = materials.filter(m => m.type === materialType);

    return (
        <FacultyLayout>
            <PageHeader
                title="Materials"
                subtitle="Manage and upload study materials and examination papers"
            />

            {/* Material Type Toggle */}
            <div className="mb-6 flex gap-3">
                <Button
                    variant={materialType === 'exam' ? 'default' : 'outline'}
                    onClick={() => setMaterialType('exam')}
                >
                    Exam Papers
                </Button>
                <Button
                    variant={materialType === 'study-material' ? 'default' : 'outline'}
                    onClick={() => setMaterialType('study-material')}
                >
                    Study Materials
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMaterials.map((material) => (
                    <div key={material.id} className="dashboard-card group">
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 bg-primary/10 rounded-xl">
                                <FileText className="w-6 h-6 text-primary" />
                            </div>
                            <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${material.status === 'ready' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                                }`}>
                                {material.status}
                            </div>
                        </div>

                        <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors">{material.title}</h3>
                        <p className="text-sm text-muted-foreground mb-4">{material.subject} • {material.class}</p>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Date: {material.date}</span>
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

                {/* Upload Card - Trigger Dialog */}
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <div className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center text-center hover:border-primary hover:bg-primary/5 transition-all cursor-pointer">
                            <div className="p-4 bg-muted rounded-full mb-4">
                                <Upload className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h4 className="font-semibold mb-1">Upload Material</h4>
                            <p className="text-xs text-muted-foreground max-w-[200px]">PDF, Word or Excel files accepted (Max 10MB)</p>
                        </div>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Upload New Material</DialogTitle>
                            <DialogDescription>
                                Add details for the new {materialType === 'exam' ? 'examination paper' : 'study material'}.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="title" className="text-right">
                                    Title
                                </Label>
                                <Input
                                    id="title"
                                    value={newMaterial.title}
                                    onChange={(e) => setNewMaterial({ ...newMaterial, title: e.target.value })}
                                    className="col-span-3"
                                    placeholder={materialType === 'exam' ? 'Final Semester Exam' : 'Chapter Notes'}
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="subject" className="text-right">
                                    Subject
                                </Label>
                                <Input
                                    id="subject"
                                    value={newMaterial.subject}
                                    onChange={(e) => setNewMaterial({ ...newMaterial, subject: e.target.value })}
                                    className="col-span-3"
                                    placeholder="Mathematics"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="class" className="text-right">
                                    Class
                                </Label>
                                <Input
                                    id="class"
                                    value={newMaterial.class}
                                    onChange={(e) => setNewMaterial({ ...newMaterial, class: e.target.value })}
                                    className="col-span-3"
                                    placeholder="Grade 10"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="date" className="text-right">
                                    Date
                                </Label>
                                <Input
                                    id="date"
                                    type="date"
                                    value={newMaterial.date}
                                    onChange={(e) => setNewMaterial({ ...newMaterial, date: e.target.value })}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="file" className="text-right">
                                    File
                                </Label>
                                <div className="col-span-3">
                                    <Input id="file" type="file" className="cursor-pointer" />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" onClick={handleAddMaterial}>Upload Material</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </FacultyLayout>
    );
}
