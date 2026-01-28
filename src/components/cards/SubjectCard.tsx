import { Card } from '@/components/ui/card';
import { Phone, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SubjectCardProps {
    id: string;
    title: string;
    code: string;
    instructor: string;
    instructorPhone?: string | null;
}

export function SubjectCard({
    title,
    code,
    instructor,
    instructorPhone
}: SubjectCardProps) {
    const handleCall = () => {
        if (instructorPhone) {
            window.location.href = `tel:${instructorPhone}`;
        }
    };

    const handleWhatsApp = () => {
        if (instructorPhone) {
            // Remove any non-digit characters
            const cleanPhone = instructorPhone.replace(/\D/g, '');
            // Open WhatsApp with the phone number
            window.open(`https://wa.me/${cleanPhone}`, '_blank');
        }
    };

    return (
        <Card className="dashboard-card hover:shadow-lg transition-all duration-300">
            <div className="flex flex-col h-full gap-4">
                {/* Subject Info */}
                <div className="flex-1">
                    <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-base sm:text-lg line-clamp-2">
                            {title}
                        </h3>
                        <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-1 rounded shrink-0">
                            {code}
                        </span>
                    </div>

                    {/* Instructor Info */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="font-medium">Faculty:</span>
                            <span className="truncate">{instructor}</span>
                        </div>

                        {instructorPhone && (
                            <div className="text-xs text-muted-foreground">
                                📱 {instructorPhone}
                            </div>
                        )}
                    </div>
                </div>

                {/* Contact Buttons */}
                {instructorPhone && (
                    <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
                        <Button
                            onClick={handleCall}
                            variant="outline"
                            size="sm"
                            className="flex-1 min-w-[80px] gap-1.5"
                        >
                            <Phone className="h-4 w-4" />
                            Call
                        </Button>
                        <Button
                            onClick={handleWhatsApp}
                            variant="outline"
                            size="sm"
                            className="flex-1 min-w-[110px] gap-1.5 text-green-600 hover:text-green-700 hover:border-green-600"
                        >
                            <MessageCircle className="h-4 w-4" />
                            WhatsApp
                        </Button>
                    </div>
                )}
            </div>
        </Card>
    );
}
