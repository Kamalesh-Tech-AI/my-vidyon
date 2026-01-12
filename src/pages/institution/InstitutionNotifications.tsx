import { InstitutionLayout } from "@/layouts/InstitutionLayout";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, FileText, Clock, CheckCircle2, Megaphone, BarChart3, CreditCard, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function InstitutionNotifications() {
    const navigate = useNavigate();

    return (
        <InstitutionLayout>
            <div className="flex flex-col h-[calc(100vh-100px)] bg-card border rounded-lg shadow-sm mx-auto max-w-5xl my-6">
                <div className="flex items-center justify-between p-4 sm:p-6 border-b">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-9 w-9 -ml-2">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                            <Bell className="w-5 h-5" />
                            Notifications
                        </h3>
                    </div>
                    <Badge variant="secondary" className="bg-warning/10 text-warning hover:bg-warning/20 border-0">
                        2 New
                    </Badge>
                </div>

                <ScrollArea className="flex-1">
                    <div className="p-4 sm:p-6 space-y-4">

                        {/* Notification 1 */}
                        <div className="rounded-lg border text-card-foreground shadow-sm p-3 sm:p-4 transition-all hover:bg-muted/50 cursor-pointer border-l-4 touch-active border-l-primary bg-primary/5">
                            <div className="flex gap-4">
                                <div className="p-2 rounded-full h-fit bg-background border shadow-sm">
                                    <FileText className="w-5 h-5 text-blue-500" />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="flex justify-between items-start">
                                        <h4 className="text-sm font-semibold text-foreground">Math Assignment Due</h4>
                                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">2 hours ago</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                        Math Assignment not submitted for Class 7A (Due: 18 Dec)
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Notification 2 */}
                        <div className="rounded-lg border text-card-foreground shadow-sm p-3 sm:p-4 transition-all hover:bg-muted/50 cursor-pointer border-l-4 touch-active border-l-primary bg-primary/5">
                            <div className="flex gap-4">
                                <div className="p-2 rounded-full h-fit bg-background border shadow-sm">
                                    <Clock className="w-5 h-5 text-red-500" />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="flex justify-between items-start">
                                        <h4 className="text-sm font-semibold text-foreground">Low Attendance Warning</h4>
                                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">5 hours ago</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                        Attendance dropped below 75% this month for Alex.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Notification 3 */}
                        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-3 sm:p-4 transition-all hover:bg-muted/50 cursor-pointer border-l-4 touch-active border-l-transparent">
                            <div className="flex gap-4">
                                <div className="p-2 rounded-full h-fit bg-background border shadow-sm">
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="flex justify-between items-start">
                                        <h4 className="text-sm font-semibold">Leave Approved</h4>
                                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">1 day ago</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                        Leave request approved for 20–21 Dec.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Notification 4 */}
                        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-3 sm:p-4 transition-all hover:bg-muted/50 cursor-pointer border-l-4 touch-active border-l-transparent">
                            <div className="flex gap-4">
                                <div className="p-2 rounded-full h-fit bg-background border shadow-sm">
                                    <Megaphone className="w-5 h-5 text-purple-500" />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="flex justify-between items-start">
                                        <h4 className="text-sm font-semibold">School Holiday</h4>
                                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">2 days ago</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                        School holiday declared on 25 Dec.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Notification 5 */}
                        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-3 sm:p-4 transition-all hover:bg-muted/50 cursor-pointer border-l-4 touch-active border-l-transparent">
                            <div className="flex gap-4">
                                <div className="p-2 rounded-full h-fit bg-background border shadow-sm">
                                    <BarChart3 className="w-5 h-5 text-orange-500" />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="flex justify-between items-start">
                                        <h4 className="text-sm font-semibold">Exam Results Out</h4>
                                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">3 days ago</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                        Mid-term exam results are now available.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Notification 6 */}
                        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-3 sm:p-4 transition-all hover:bg-muted/50 cursor-pointer border-l-4 touch-active border-l-transparent">
                            <div className="flex gap-4">
                                <div className="p-2 rounded-full h-fit bg-background border shadow-sm">
                                    <CreditCard className="w-5 h-5 text-yellow-500" />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="flex justify-between items-start">
                                        <h4 className="text-sm font-semibold">Fee Due Reminder</h4>
                                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">1 week ago</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                        Term 2 fees due by 30 Dec.
                                    </p>
                                </div>
                            </div>
                        </div>

                    </div>
                </ScrollArea>

                <div className="p-4 border-t bg-muted/20 text-center rounded-b-lg">
                    <Button variant="link" className="text-sm text-primary hover:underline h-auto p-0">
                        Mark all as read
                    </Button>
                </div>
            </div>
        </InstitutionLayout>
    );
}
