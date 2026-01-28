import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/common/Badge';

interface StudentReviewModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    reviewStudent: any;
    classExamResults: any[];
    onReject: () => void;
    onPublish: () => void;
    isSubmitting?: boolean;
}

export function StudentReviewModal({
    isOpen,
    onOpenChange,
    reviewStudent,
    classExamResults,
    onReject,
    onPublish,
    isSubmitting
}: StudentReviewModalProps) {
    if (!reviewStudent) return null;

    const studentResults = classExamResults.filter((r: any) => r.student_id === reviewStudent.id);
    const hasData = studentResults.length > 0;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Student Marks Review</DialogTitle>
                    <DialogDescription>
                        Reviewing performance for <span className="font-semibold text-foreground">{reviewStudent?.name}</span> ({reviewStudent?.roll_no})
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                                <th className="py-2 text-left">Subject</th>
                                <th className="py-2 text-center">Internal</th>
                                <th className="py-2 text-center">External</th>
                                <th className="py-2 text-center">Total</th>
                                <th className="py-2 text-center">Faculty Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {studentResults.map((result: any) => (
                                <tr key={result.id} className="text-sm">
                                    <td className="py-3 font-medium">{result.subjects?.name}</td>
                                    <td className="py-3 text-center">{result.internal_marks}</td>
                                    <td className="py-3 text-center">{result.external_marks}</td>
                                    <td className="py-3 text-center font-bold">{result.total_marks}</td>
                                    <td className="py-3 text-center">
                                        <Badge variant={result.status === 'SUBMITTED' ? 'warning' : 'outline'}>
                                            {result.status}
                                        </Badge>
                                    </td>
                                </tr>
                            ))}
                            {!hasData && (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                                        No marks submitted for this student yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <DialogFooter className="gap-2 sm:justify-between">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>

                    <div className="flex gap-2">
                        <Button
                            variant="destructive"
                            onClick={onReject}
                            disabled={!hasData || isSubmitting}
                        >
                            Reject All
                        </Button>
                        <Button
                            className="btn-primary"
                            onClick={onPublish}
                            disabled={!hasData || isSubmitting}
                        >
                            Publish Results
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
