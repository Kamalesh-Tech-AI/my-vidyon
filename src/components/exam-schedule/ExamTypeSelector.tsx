import { ReactNode, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Calendar, FileText } from 'lucide-react';

interface ExamType {
    description: ReactNode;
    value: string;
    label: string;
    short: string;
}

const EXAM_TYPES: ExamType[] = [
    {
        value: 'mid-term-1', label: 'Mid 1', short: 'Mid 1',
        description: ''
    },
    {
        value: 'quarterly', label: 'Quarterly', short: 'Quarterly',
        description: ''
    },
    {
        value: 'mid-term-2', label: 'Mid 2', short: 'Mid 2',
        description: ''
    },
    {
        value: 'half-yearly', label: 'Half yearly', short: 'Half yearly',
        description: ''
    },
    {
        value: 'model', label: 'Model', short: 'Model',
        description: ''
    },
    {
        value: 'annual', label: 'Annual', short: 'Annual',
        description: ''
    }
];

interface ExamTypeSelectorProps {
    onSelect: (examType: ExamType) => void;
    selectedType?: string;
}

export function ExamTypeSelector({ onSelect, selectedType }: ExamTypeSelectorProps) {
    const [selected, setSelected] = useState<string>(selectedType || '');

    const handleSelect = (value: string) => {
        setSelected(value);
        const examType = EXAM_TYPES.find(t => t.value === value);
        if (examType) {
            onSelect(examType);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center py-12 space-y-6">
            <div className="text-center space-y-2">
                <div className="flex items-center justify-center w-16 h-16 mx-auto bg-primary/10 rounded-full">
                    <FileText className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Create Exam Schedule</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                    Select the exam type to create a schedule for your class
                </p>
            </div>

            <div className="w-full max-w-md space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Exam Type</label>
                    <Select value={selected} onValueChange={handleSelect}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select exam type" />
                        </SelectTrigger>
                        <SelectContent>
                            {EXAM_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        {type.label}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {selected && (
                    <div className="p-4 bg-muted/50 rounded-lg border">
                        <p className="text-sm text-muted-foreground">
                            You're creating a schedule for{' '}
                            <span className="font-semibold text-foreground">
                                {EXAM_TYPES.find(t => t.value === selected)?.label}
                            </span>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export { EXAM_TYPES };
export type { ExamType };
