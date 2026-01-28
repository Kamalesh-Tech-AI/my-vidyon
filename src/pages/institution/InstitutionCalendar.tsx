import { useState, useEffect } from 'react';
import { InstitutionLayout } from '@/layouts/InstitutionLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/common/Badge';
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, Loader2, BookOpen, Users, FileText, Download, Clock, Filter, Trash2, CalendarDays, Image, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ExamSchedulePreview } from '@/components/exam-schedule/ExamSchedulePreview';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { format, parse, isValid } from 'date-fns';

// Type definition matching DB
interface AcademicEvent {
    id: string;
    title: string;
    date: string; // UI format string
    start_date: string; // DB ISO
    end_date: string; // DB ISO
    type: string;
    category: string;
    description: string;
    isUserAdded: boolean; // Flag to distiguish (mostly true for DB items)
    banner_url?: string | null;
}

const CLASSES = ['LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const GROUPS = ['BioScience', 'Computer Science', 'Commerce', 'Computer Application'];
const EXAMS = ['Mid-Term 1', 'Quarterly', 'Mid-Term 2', 'Half-yearly', 'Model Exam', 'Annual'];

const EXAM_COLORS: Record<string, string> = {
    'Mid-Term 1': 'text-purple-600 bg-purple-100 border-purple-200',
    'Quarterly': 'text-blue-600 bg-blue-100 border-blue-200',
    'Mid-Term 2': 'text-pink-600 bg-pink-100 border-pink-200',
    'Half-yearly': 'text-green-600 bg-green-100 border-green-200',
    'Model Exam': 'text-orange-600 bg-orange-100 border-orange-200',
    'Annual': 'text-red-600 bg-red-100 border-red-200',
};

export function InstitutionCalendar() {
    const { user } = useAuth();
    const [events, setEvents] = useState<AcademicEvent[]>([]);
    const [loading, setLoading] = useState(true);

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<AcademicEvent | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingEvent, setEditingEvent] = useState<AcademicEvent | null>(null);
    const [newEvent, setNewEvent] = useState({
        title: '',
        type: '',
        category: '',
        description: ''
    });
    const [dateRange, setDateRange] = useState<DateRange | undefined>();

    // Filter State
    const [filterState, setFilterState] = useState({
        showHolidays: true,
        showExams: true, // Always show exams by default
        showPublic: true
    });

    // Exam Schedule Logic
    const [selectedExamClass, setSelectedExamClass] = useState<string | null>(null);
    const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
    const [viewTimetable, setViewTimetable] = useState<{ exam: string } | null>(null);
    const [timetableData, setTimetableData] = useState<any>(null);
    const [isFetchingTimetable, setIsFetchingTimetable] = useState(false);

    // Fetch Events
    useEffect(() => {
        if (!user?.institutionId) return;

        const fetchEvents = async () => {
            try {
                // 1. Resolve to Text ID
                const { data: instData } = await supabase
                    .from('institutions')
                    .select('institution_id')
                    .eq('id', user.institutionId)
                    .maybeSingle();

                const textId = instData?.institution_id;
                if (!textId) return;

                const { data, error } = await supabase
                    .from('academic_events')
                    .select('*')
                    .eq('institution_id', textId)
                    .order('start_date', { ascending: true });

                if (error) throw error;

                if (data) {
                    const formattedEvents: AcademicEvent[] = data.map(e => {
                        const start = new Date(e.start_date);
                        const end = new Date(e.end_date);

                        let dateStr = format(start, 'MMM dd, yyyy');
                        if (start.getTime() !== end.getTime()) {
                            dateStr = `${format(start, 'MMM dd')} - ${format(end, 'MMM dd, yyyy')}`;
                        }

                        return {
                            id: e.id,
                            title: e.title,
                            type: e.event_type,
                            category: e.category || 'General',
                            description: e.description || '',
                            date: dateStr,
                            start_date: e.start_date,
                            end_date: e.end_date,
                            isUserAdded: true,
                            banner_url: e.banner_url || null
                        };
                    });

                    setEvents(formattedEvents);
                }
            } catch (err: any) {
                console.error("Error fetching academic events:", err);
                toast.error("Failed to load calendar events");
            } finally {
                setLoading(false);
            }
        };

        fetchEvents();

        // Realtime Subscription (Need Text ID first? Or just listen to all changes? Or sub in inner function?)
        // Since subscription is async, we can do a quick fetch
        let channelEvents: any = null;

        const sub = async () => {
            const { data: instData } = await supabase
                .from('institutions')
                .select('institution_id')
                .eq('id', user.institutionId)
                .maybeSingle();
            const textId = instData?.institution_id;
            if (!textId) return;

            channelEvents = supabase
                .channel('academic_events_changes')
                .on('postgres_changes',
                    { event: '*', schema: 'public', table: 'academic_events', filter: `institution_id=eq.${textId}` },
                    () => fetchEvents()
                )
                .subscribe();
        };
        sub();

        return () => {
            if (channelEvents) supabase.removeChannel(channelEvents);
        };
    }, [user?.institutionId]);

    const handleClassSelect = (cls: string) => {
        setSelectedExamClass(cls);
        setSelectedGroup(null); // Reset group when class changes
    };

    const handleGroupSelect = (group: string) => {
        setSelectedGroup(group);
    };

    const handleExamSelect = (exam: string) => {
        setViewTimetable({ exam });
    };

    // Fetch timetable data when selection changes
    useEffect(() => {
        const fetchTimetableEntries = async () => {
            if (!viewTimetable || !selectedExamClass || !user?.institutionId) return;

            setIsFetchingTimetable(true);
            try {
                // 1. Get Text ID (It's likely already in user.institutionId based on AuthContext, but verifying)
                // If user.institutionId is 'MYVID2026', we don't need to fetch it again if we just want the text ID.
                // However, let's keep it safe. 
                // The error was `.eq('id', user.institutionId)` where user.institutionId is 'MYVID2026' (text) but id is UUID.

                let textId = user.institutionId;

                // Check if it's a UUID (hypothetical check, but effectively we just trust it or verify existence)
                // If the user context has the text ID, we can skip this fetch or fix the query.
                // Let's assume user.institutionId IS the text ID like 'MYVID2026'.

                // But just in case it's a UUID (legacy logic?), we can try to resolve it.
                // Better approach: Query by institution_id OR id. 

                const { data: instData } = await supabase
                    .from('institutions')
                    .select('institution_id')
                    .or(`id.eq.${user.institutionId},institution_id.eq.${user.institutionId}`)
                    .maybeSingle();

                if (instData) {
                    textId = instData.institution_id;
                }
                if (!textId) return;

                // Normalize exam type for comparison
                const examType = viewTimetable.exam.toLowerCase().replace(/\s+/g, '-');

                // Normalization: Check for both "10" and "10th"
                const normalizedClassVariant = selectedExamClass.match(/^\d+$/)
                    ? `${selectedExamClass}th`
                    : selectedExamClass.replace(/th$/i, '');

                const { data, error } = await supabase
                    .from('exam_schedules')
                    .select(`
                        *,
                        exam_schedule_entries (*)
                    `)
                    .eq('institution_id', textId)
                    .or(`class_id.eq.${selectedExamClass},class_id.eq.${normalizedClassVariant}`)
                    .or(`exam_type.eq.${examType},exam_display_name.ilike.%${viewTimetable.exam}%`)
                    .maybeSingle();

                console.log('📋 Query search values:', {
                    institution_id: textId,
                    class_variants: [selectedExamClass, normalizedClassVariant],
                    exam_variants: [examType, viewTimetable.exam]
                });

                if (error) {
                    console.error('❌ Error fetching timetable:', error);
                    setTimetableData(null);
                } else if (!data) {
                    console.log('ℹ️ No schedule found for:', { selectedExamClass, normalizedClassVariant, examType });
                    setTimetableData(null);
                } else {
                    console.log('✅ Found timetable data:', data);
                    console.log('🔢 Entries count:', data.exam_schedule_entries?.length || 0);
                    setTimetableData(data);
                }
            } catch (err) {
                console.error("Unexpected error fetching timetable:", err);
            } finally {
                setIsFetchingTimetable(false);
            }
        };

        fetchTimetableEntries();
    }, [viewTimetable, selectedExamClass, user?.institutionId]);

    // Smooth Calendar Transition
    const calendarTransitionStyle = `
        @keyframes smoothSlideNext {
            0% {
                opacity: 0;
                transform: translateX(20px);
            }
            100% {
                opacity: 1;
                transform: translateX(0);
            }
        }

        @keyframes smoothSlidePrev {
            0% {
                opacity: 0;
                transform: translateX(-20px);
            }
            100% {
                opacity: 1;
                transform: translateX(0);
            }
        }

        .animate-slide-next {
            animation: smoothSlideNext 300ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        .animate-slide-prev {
            animation: smoothSlidePrev 300ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
    `;

    // Calendar Logic
    const [currentDate, setCurrentDate] = useState(new Date()); // Default to today
    const [direction, setDirection] = useState<'next' | 'prev'>('next');
    const [isAnimating, setIsAnimating] = useState(false);

    // New Event Form State
    const [eventBanner, setEventBanner] = useState<File | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [eventToDelete, setEventToDelete] = useState<string | null>(null);

    const handleEventClick = (event: AcademicEvent) => {
        setSelectedEvent(event);
        setIsDetailsDialogOpen(true);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const maxSize = 10 * 1024 * 1024; // 10MB in bytes

            if (file.size > maxSize) {
                toast.error(`File size exceeds 10MB limit. Please choose a smaller image. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
                e.target.value = ''; // Clear the input
                return;
            }

            setEventBanner(file);
        }
    };

    const handleAddEvent = async () => {
        if (!user?.institutionId) return;
        setIsSubmitting(true);

        try {
            // Resolve Text ID
            const { data: instData } = await supabase
                .from('institutions')
                .select('institution_id')
                .eq('id', user.institutionId)
                .maybeSingle();
            const textId = instData?.institution_id;
            if (!textId) throw new Error("Institution ID not found");

            if (!dateRange?.from) {
                toast.error("Please select a date range");
                setIsSubmitting(false);
                return;
            }

            const start = dateRange.from;
            const end = dateRange.to || dateRange.from;

            let bannerUrl: string | null = null;

            console.log("Saving event with state:", { newEvent, dates: { start, end }, hasBanner: !!eventBanner });

            // Upload banner if selected
            if (eventBanner) {
                const fileExt = eventBanner.name.split('.').pop();
                const fileName = `${user.institutionId}/${Date.now()}.${fileExt}`;

                console.log("Starting banner upload:", fileName);

                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('event-banners')
                    .upload(fileName, eventBanner, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (uploadError) {
                    console.error('Banner upload error:', uploadError);
                    toast.error('Failed to upload banner: ' + uploadError.message);
                } else {
                    console.log("Banner upload successful, getting public URL");
                    // Get public URL
                    const { data: { publicUrl } } = supabase.storage
                        .from('event-banners')
                        .getPublicUrl(fileName);

                    console.log("Generated Banner URL:", publicUrl);
                    bannerUrl = publicUrl;
                }
            } else {
                console.log("No banner file selected");
            }

            console.log("Inserting event into DB with banner_url:", bannerUrl);

            const { error } = await supabase.from('academic_events').insert([{
                institution_id: textId,
                title: newEvent.title,
                description: newEvent.description,
                event_type: newEvent.type,
                category: newEvent.category,
                start_date: dateRange.from.toISOString(),
                end_date: (dateRange.to || dateRange.from).toISOString(),
                banner_url: bannerUrl,
                event_date: dateRange.from.toISOString().split('T')[0]
            }]);

            if (error) throw error;

            toast.success("Event added successfully");
            setIsAddDialogOpen(false);
            setNewEvent({ title: '', type: '', category: '', description: '' });
            setDateRange(undefined);
            setEventBanner(null);

        } catch (err: any) {
            console.error("Error adding event:", err);
            toast.error(err.message || "Failed to add event");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteClick = (id: string) => {
        setEventToDelete(id);
        setIsDeleteOpen(true);
    };

    const confirmDelete = async () => {
        if (!eventToDelete || !user?.institutionId) return;

        try {
            const { error } = await supabase
                .from('academic_events')
                .delete()
                .eq('id', eventToDelete)
                .eq('institution_id', user.institutionId);

            if (error) throw error;

            toast.success("Event deleted successfully");
            setIsDeleteOpen(false);
            setEventToDelete(null);
        } catch (err: any) {
            console.error("Error deleting event:", err);
            toast.error("Failed to delete event");
        }
    };

    const handleEditClick = (event: AcademicEvent) => {
        setEditingEvent(event);
        setNewEvent({
            title: event.title,
            type: event.type,
            category: event.category,
            description: event.description
        });

        // Set date range from event dates
        const startDate = new Date(event.start_date);
        const endDate = new Date(event.end_date);
        setDateRange({
            from: startDate,
            to: startDate.getTime() === endDate.getTime() ? undefined : endDate
        });

        setIsEditDialogOpen(true);
    };

    const handleUpdateEvent = async () => {
        if (!user?.institutionId || !editingEvent || !newEvent.title || !dateRange?.from) return;
        setIsSubmitting(true);

        try {
            // No need to resolve ID for Update as we have Event ID, BUT good to verify ownership if RLS wasn't enough?
            // Existing logic just updates by ID. RLS handles the rest.

            let bannerUrl: string | null = editingEvent.banner_url || null;

            // Upload new banner if selected
            if (eventBanner) {
                const fileExt = eventBanner.name.split('.').pop();
                const fileName = `${user.institutionId}/${Date.now()}.${fileExt}`;

                console.log("Starting banner update upload:", fileName);

                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('event-banners')
                    .upload(fileName, eventBanner, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (uploadError) {
                    console.error('Banner upload error:', uploadError);
                    toast.error('Failed to upload banner: ' + uploadError.message);
                } else {
                    const { data: { publicUrl } } = supabase.storage
                        .from('event-banners')
                        .getPublicUrl(fileName);

                    console.log("Generated New Banner URL:", publicUrl);
                    bannerUrl = publicUrl;
                }
            } else {
                console.log("No new banner selected, keeping:", bannerUrl);
            }

            const { error } = await supabase
                .from('academic_events')
                .update({
                    title: newEvent.title,
                    description: newEvent.description,
                    event_type: newEvent.type,
                    category: newEvent.category,
                    start_date: dateRange.from.toISOString(),
                    end_date: (dateRange.to || dateRange.from).toISOString(),
                    banner_url: bannerUrl,
                    event_date: dateRange.from.toISOString().split('T')[0]
                })
                .eq('id', editingEvent.id)
                .eq('institution_id', user.institutionId);

            if (error) throw error;

            toast.success("Event updated successfully");
            setIsEditDialogOpen(false);
            setEditingEvent(null);
            setNewEvent({ title: '', type: '', category: '', description: '' });
            setDateRange(undefined);
            setEventBanner(null);

        } catch (err: any) {
            console.error("Error updating event:", err);
            toast.error(err.message || "Failed to update event");
        } finally {
            setIsSubmitting(false);
        }
    };

    const getDaysInMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const handlePrevMonth = () => {
        if (isAnimating) return;
        setIsAnimating(true);
        setDirection('prev');
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
        setTimeout(() => setIsAnimating(false), 300);
    };

    const handleNextMonth = () => {
        if (isAnimating) return;
        setIsAnimating(true);
        setDirection('next');
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
        setTimeout(() => setIsAnimating(false), 300);
    };

    return (
        <InstitutionLayout>
            <style>{calendarTransitionStyle}</style>
            <PageHeader
                title="Academic Calendar"
                subtitle="Schedule and track academic events, exams, and holidays"
                actions={
                    <div className="flex items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon">
                                    <Filter className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>Filter Calendar</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuCheckboxItem
                                    checked={filterState.showHolidays}
                                    onCheckedChange={(checked) => setFilterState(prev => ({ ...prev, showHolidays: checked }))}
                                >
                                    Show Holidays
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem
                                    checked={filterState.showExams}
                                    onCheckedChange={(checked) => setFilterState(prev => ({ ...prev, showExams: checked }))}
                                >
                                    Show Exam Dates
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem
                                    checked={filterState.showPublic}
                                    onCheckedChange={(checked) => setFilterState(prev => ({ ...prev, showPublic: checked }))}
                                >
                                    Public Visibility
                                </DropdownMenuCheckboxItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                            <DialogTrigger asChild>
                                <Button className="flex items-center gap-2">
                                    <Plus className="w-4 h-4" />
                                    Add Event
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                    <DialogTitle>Add Event</DialogTitle>
                                    <DialogDescription>
                                        Create a new event in the academic calendar. Use format "Mon DD, YYYY" or "Mon DD - Mon DD".
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="title" className="text-right">Title</Label>
                                        <Input
                                            id="title"
                                            value={newEvent.title}
                                            onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                                            className="col-span-3"
                                            placeholder="Event Title"
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="date" className="text-right">Date</Label>
                                        <div className="col-span-3">
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        id="date"
                                                        variant={"outline"}
                                                        className={cn(
                                                            "w-full justify-start text-left font-normal",
                                                            !dateRange && "text-muted-foreground"
                                                        )}
                                                    >
                                                        <CalendarDays className="mr-2 h-4 w-4" />
                                                        {dateRange?.from ? (
                                                            dateRange.to ? (
                                                                <>
                                                                    {format(dateRange.from, "LLL dd, y")} -{" "}
                                                                    {format(dateRange.to, "LLL dd, y")}
                                                                </>
                                                            ) : (
                                                                format(dateRange.from, "LLL dd, y")
                                                            )
                                                        ) : (
                                                            <span>Pick a date</span>
                                                        )}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        initialFocus
                                                        mode="range"
                                                        defaultMonth={dateRange?.from}
                                                        selected={dateRange}
                                                        onSelect={setDateRange}
                                                        numberOfMonths={2}
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="type" className="text-right">Type</Label>
                                        <div className="col-span-3">
                                            <Select
                                                value={newEvent.type}
                                                onValueChange={(value) => setNewEvent({ ...newEvent, type: value })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="academic">Academic</SelectItem>
                                                    <SelectItem value="exam">Exam</SelectItem>
                                                    <SelectItem value="cultural">Cultural</SelectItem>
                                                    <SelectItem value="holiday">Holiday</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="category" className="text-right">Category</Label>
                                        <Input
                                            id="category"
                                            value={newEvent.category}
                                            onChange={(e) => setNewEvent({ ...newEvent, category: e.target.value })}
                                            className="col-span-3"
                                            placeholder="e.g. Major Event"
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="description" className="text-right">Description</Label>
                                        <Textarea
                                            id="description"
                                            value={newEvent.description}
                                            onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                                            className="col-span-3"
                                            placeholder="Event details..."
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="banner" className="text-right">Banner</Label>
                                        <div className="col-span-3">
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    id="banner"
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleFileChange}
                                                    className="flex-1"
                                                />
                                                {eventBanner && (
                                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                        <Image className="w-3 h-3" />
                                                        {eventBanner.name}
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Upload an image banner for this event (optional)
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="submit" onClick={handleAddEvent} disabled={!newEvent.title || !dateRange?.from || isSubmitting}>
                                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Save Event
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        {/* Edit Event Dialog */}
                        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                            <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                    <DialogTitle>Edit Event</DialogTitle>
                                    <DialogDescription>
                                        Update the event details in the academic calendar.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="edit-title" className="text-right">Title</Label>
                                        <Input
                                            id="edit-title"
                                            value={newEvent.title}
                                            onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                                            className="col-span-3"
                                            placeholder="Event Title"
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="edit-date" className="text-right">Date</Label>
                                        <div className="col-span-3">
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        id="edit-date"
                                                        variant={"outline"}
                                                        className={cn(
                                                            "w-full justify-start text-left font-normal",
                                                            !dateRange && "text-muted-foreground"
                                                        )}
                                                    >
                                                        <CalendarDays className="mr-2 h-4 w-4" />
                                                        {dateRange?.from ? (
                                                            dateRange.to ? (
                                                                <>
                                                                    {format(dateRange.from, "LLL dd, y")} -{" "}
                                                                    {format(dateRange.to, "LLL dd, y")}
                                                                </>
                                                            ) : (
                                                                format(dateRange.from, "LLL dd, y")
                                                            )
                                                        ) : (
                                                            <span>Pick a date</span>
                                                        )}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        initialFocus
                                                        mode="range"
                                                        defaultMonth={dateRange?.from}
                                                        selected={dateRange}
                                                        onSelect={setDateRange}
                                                        numberOfMonths={2}
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="edit-type" className="text-right">Type</Label>
                                        <div className="col-span-3">
                                            <Select
                                                value={newEvent.type}
                                                onValueChange={(value) => setNewEvent({ ...newEvent, type: value })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="academic">Academic</SelectItem>
                                                    <SelectItem value="exam">Exam</SelectItem>
                                                    <SelectItem value="cultural">Cultural</SelectItem>
                                                    <SelectItem value="holiday">Holiday</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="edit-category" className="text-right">Category</Label>
                                        <Input
                                            id="edit-category"
                                            value={newEvent.category}
                                            onChange={(e) => setNewEvent({ ...newEvent, category: e.target.value })}
                                            className="col-span-3"
                                            placeholder="e.g. Major Event"
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="edit-description" className="text-right">Description</Label>
                                        <Textarea
                                            id="edit-description"
                                            value={newEvent.description}
                                            onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                                            className="col-span-3"
                                            placeholder="Event details..."
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="edit-banner" className="text-right">Banner</Label>
                                        <div className="col-span-3">
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    id="edit-banner"
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleFileChange}
                                                    className="flex-1"
                                                />
                                                {eventBanner && (
                                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                        <Image className="w-3 h-3" />
                                                        {eventBanner.name}
                                                    </div>
                                                )}
                                            </div>
                                            {editingEvent?.banner_url && !eventBanner && (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Current banner will be kept if no new file is selected
                                                </p>
                                            )}
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Upload a new image to replace the current banner (optional)
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="submit" onClick={handleUpdateEvent} disabled={!newEvent.title || !dateRange?.from || isSubmitting}>
                                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Update Event
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                }
            />

            {/* Main Content Grid - Adjusted for Full Width Calendar and new sections */}
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
                {/* Full Width Calendar Section */}
                <div className="dashboard-card pt-6 shadow-md hover:shadow-lg transition-shadow duration-300">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                            <CalendarIcon className="w-5 h-5 text-primary" />
                            {currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                        </h3>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={handlePrevMonth} disabled={isAnimating}>
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleNextMonth} disabled={isAnimating}>
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="h-[400px] flex items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div
                            key={`${currentDate.toString()}`}
                            className={`grid grid-cols-7 gap-px bg-border overflow-hidden rounded-lg ${direction === 'next' ? 'animate-slide-next' : 'animate-slide-prev'}`}
                        >
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <div key={day} className="bg-muted p-2 text-center text-xs font-semibold text-muted-foreground">{day}</div>
                            ))}

                            {/* Empty cells for days before start of month */}
                            {Array.from({ length: getFirstDayOfMonth(currentDate) }).map((_, i) => (
                                <div key={`empty-${i}`} className="bg-background/50 min-h-[100px] border-t border-r last:border-r-0" />
                            ))}

                            {/* Actual days */}
                            {Array.from({ length: getDaysInMonth(currentDate) }).map((_, i) => {
                                const day = i + 1;
                                const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);

                                const today = new Date();
                                const isToday = day === today.getDate() &&
                                    currentDate.getMonth() === today.getMonth() &&
                                    currentDate.getFullYear() === today.getFullYear();

                                // Event Filtering and Ranges
                                const dayEvents = events.filter(e => {
                                    if (e.type === 'holiday' && !filterState.showHolidays) return false;
                                    // if (e.type === 'exam' && !filterState.showExams) return false;

                                    const start = new Date(e.start_date);
                                    const end = new Date(e.end_date);
                                    // Normalise time
                                    start.setHours(0, 0, 0, 0);
                                    end.setHours(0, 0, 0, 0);
                                    dateObj.setHours(0, 0, 0, 0);

                                    return dateObj >= start && dateObj <= end;
                                });

                                return (
                                    <div key={`day-${day}`} className={`bg-background min-h-[100px] p-2 border-t border-r last:border-r-0 hover:bg-muted/30 transition-colors ${isToday ? 'bg-primary/5' : ''}`}>
                                        <div className="flex justify-between items-start">
                                            <span className={`text-sm ${isToday ? 'font-bold text-primary' : ''}`}>{day}</span>
                                        </div>
                                        <div className="space-y-1 mt-1">
                                            {dayEvents.map((evt, idx) => {
                                                const colorClass = evt.type === 'exam' && EXAM_COLORS[evt.category]
                                                    ? EXAM_COLORS[evt.category]
                                                    : evt.type === 'holiday'
                                                        ? 'bg-destructive/10 text-destructive border-destructive/20'
                                                        : 'bg-primary/10 text-primary border-primary/20';

                                                return (
                                                    <div key={`${evt.id}-${idx}`} className={`p-1 text-[10px] rounded truncate border ${colorClass}`} title={evt.title}>
                                                        {evt.title}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Upcoming Events Section - Horizontal Row */}
            <div className="mt-8 dashboard-card shadow-md hover:shadow-lg transition-shadow duration-300">
                <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
                    <CalendarIcon className="w-5 h-5 text-primary" />
                    Upcoming Events
                </h3>

                {events.length > 0 ? (
                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-6 px-6">
                        {events.map((event, index) => (
                            <div key={event.id} className="flex-none w-[300px] rounded-xl overflow-hidden border bg-card hover:shadow-md transition-all group relative">
                                <div className="h-40 bg-muted relative overflow-hidden">
                                    {event.banner_url ? (
                                        <img
                                            src={event.banner_url}
                                            alt={event.title}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-primary/5">
                                            <CalendarIcon className="w-12 h-12 text-primary/20" />
                                        </div>
                                    )}
                                    <div className="absolute top-2 right-2">
                                        <Badge variant="info" className="bg-background/80 backdrop-blur-sm text-foreground shadow-sm uppercase text-[10px]">{event.type}</Badge>
                                    </div>
                                </div>
                                {event.isUserAdded && (
                                    <>
                                        <button
                                            onClick={() => handleEditClick(event)}
                                            className="absolute top-2 left-2 p-1.5 bg-background/80 text-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary hover:text-white z-10"
                                            title="Edit Event"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteClick(event.id)}
                                            className="absolute top-2 left-12 p-1.5 bg-background/80 text-destructive rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-white z-10"
                                            title="Delete Event"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </>
                                )}
                                <div
                                    className="p-4 bg-card cursor-pointer"
                                    onClick={() => handleEventClick(event)}
                                >
                                    <h4 className="font-semibold text-base mb-1 line-clamp-1" title={event.title}>{event.title}</h4>
                                    <div className="text-xs text-muted-foreground flex items-center gap-2 mb-2">
                                        <Clock className="w-3 h-3" />
                                        {event.date}
                                    </div>
                                    {event.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{event.description}</p>}
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-primary font-medium">{event.category}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="border-dashed border-2 bg-muted/30 rounded-lg flex flex-col items-center justify-center h-48 text-muted-foreground" style={{ marginLeft: '-0.5rem', marginRight: '-0.5rem' }}>
                        <CalendarIcon className="w-12 h-12 mb-3 opacity-20" />
                        <p>No upcoming events created yet.</p>
                        <p className="text-xs opacity-70 mt-1">Click "Add Event" to create one.</p>
                    </div>
                )}
            </div>

            {/* Event Details Dialog */}
            <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    {selectedEvent && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="text-xl">{selectedEvent.title}</DialogTitle>
                                <DialogDescription>
                                    {selectedEvent.date}
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                {selectedEvent.banner_url && (
                                    <div className="rounded-lg overflow-hidden">
                                        <img
                                            src={selectedEvent.banner_url}
                                            alt={selectedEvent.title}
                                            className="w-full h-64 object-cover"
                                        />
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Type</p>
                                        <Badge variant="info" className="mt-1 uppercase">{selectedEvent.type}</Badge>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Category</p>
                                        <p className="text-sm mt-1">{selectedEvent.category}</p>
                                    </div>
                                </div>
                                {selectedEvent.description && (
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground mb-2">Description</p>
                                        <p className="text-sm">{selectedEvent.description}</p>
                                    </div>
                                )}
                            </div>
                            <DialogFooter>
                                {selectedEvent.isUserAdded && (
                                    <Button variant="destructive" onClick={() => {
                                        setIsDetailsDialogOpen(false);
                                        handleDeleteClick(selectedEvent.id);
                                    }}>
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete
                                    </Button>
                                )}
                                <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
                                    Close
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <Trash2 className="w-5 h-5" />
                            Delete Event
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this event? This action cannot be undone and will be removed from all portals immediately.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:justify-end">
                        <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmDelete}>Delete Event</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Exam Schedule Section - Static for now as it maps to timetable which is big feature */}
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Exam Schedule Section */}
                <div className="lg:col-span-2 dashboard-card overflow-hidden bg-card border shadow-sm relative animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="h-16 border-b flex items-center px-6 justify-between bg-card/50">
                        <h3 className="font-semibold flex items-center gap-2">
                            <CalendarIcon className="w-5 h-5 text-primary" />
                            Exam Schedules
                        </h3>
                        {selectedExamClass && (
                            <div className="flex items-center gap-2 text-sm">
                                <Badge variant="outline">Class {selectedExamClass}</Badge>
                                {selectedGroup && <Badge variant="outline">{selectedGroup}</Badge>}
                            </div>
                        )}
                    </div>

                    <div className="h-[400px] flex divide-x divide-border/50">
                        {/* Column 1: Classes */}
                        <div className="flex-1 min-w-[200px] flex flex-col bg-card/30">
                            <div className="p-3 bg-muted/20 text-xs font-semibold uppercase tracking-wider text-muted-foreground sticky top-0 backdrop-blur-sm z-10">
                                Select Class
                            </div>
                            <ScrollArea className="flex-1 p-2">
                                <div className="space-y-1">
                                    {CLASSES.map((cls) => (
                                        <Button
                                            key={cls}
                                            variant={selectedExamClass === cls ? "secondary" : "ghost"}
                                            className={cn(
                                                "w-full justify-between h-10 px-4 transition-all",
                                                selectedExamClass === cls ? "bg-primary/10 text-primary font-semibold" : "text-foreground hover:text-primary hover:bg-muted"
                                            )}
                                            onClick={() => handleClassSelect(cls)}
                                        >
                                            <span>Class {cls}</span>
                                            {selectedExamClass === cls && <ChevronRight className="w-4 h-4 ml-2" />}
                                        </Button>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>

                        {/* Column 2: Groups (for 11/12) OR Exams (for others) */}
                        <div className="flex-1 min-w-[200px] flex flex-col bg-card/30 relative">
                            {selectedExamClass ? (
                                <div className="absolute inset-0 flex flex-col animate-in fade-in slide-in-from-left-2 duration-300">
                                    <div className="p-3 bg-muted/20 text-xs font-semibold uppercase tracking-wider text-muted-foreground sticky top-0 backdrop-blur-sm z-10">
                                        {['11', '12'].includes(selectedExamClass) ? 'Select Stream' : 'Select Exam'}
                                    </div>
                                    <ScrollArea className="flex-1 p-2">
                                        <div className="space-y-1">
                                            {['11', '12'].includes(selectedExamClass) ? (
                                                // Show Groups for 11 & 12
                                                GROUPS.map((group) => (
                                                    <Button
                                                        key={group}
                                                        variant={selectedGroup === group ? "secondary" : "ghost"}
                                                        className={cn(
                                                            "w-full justify-between h-10 px-4 transition-all",
                                                            selectedGroup === group ? "bg-primary/10 text-primary font-semibold" : "text-foreground hover:text-primary hover:bg-muted"
                                                        )}
                                                        onClick={() => handleGroupSelect(group)}
                                                    >
                                                        <span>{group}</span>
                                                        {selectedGroup === group && <ChevronRight className="w-4 h-4 ml-2" />}
                                                    </Button>
                                                ))
                                            ) : (
                                                // Show Exams for LKG-10
                                                EXAMS.map((exam) => (
                                                    <Button
                                                        key={exam}
                                                        variant="ghost"
                                                        className="w-full justify-between h-10 px-4 hover:bg-primary/5 hover:text-primary group"
                                                        onClick={() => handleExamSelect(exam)}
                                                    >
                                                        <span className="flex items-center gap-2">
                                                            <div className={cn("w-2 h-2 rounded-full", EXAM_COLORS[exam]?.split(' ')[1] || "bg-primary")} />
                                                            {exam}
                                                        </span>
                                                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                                    </Button>
                                                ))
                                            )}
                                        </div>
                                    </ScrollArea>
                                </div>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/30 p-8 text-center">
                                    <BookOpen className="w-12 h-12 mb-2 opacity-20" />
                                    <p className="text-sm">Select a class first</p>
                                </div>
                            )}
                        </div>

                        {/* Column 3: Exams (only for 11/12 when group selected) */}
                        {selectedExamClass && ['11', '12'].includes(selectedExamClass) && (
                            <div className="flex-1 min-w-[200px] flex flex-col bg-card/30 relative border-l">
                                {selectedGroup ? (
                                    <div className="absolute inset-0 flex flex-col animate-in fade-in slide-in-from-left-2 duration-300">
                                        <div className="p-3 bg-muted/20 text-xs font-semibold uppercase tracking-wider text-muted-foreground sticky top-0 backdrop-blur-sm z-10">
                                            Select Exam
                                        </div>
                                        <ScrollArea className="flex-1 p-2">
                                            <div className="space-y-1">
                                                {EXAMS.map((exam) => (
                                                    <Button
                                                        key={exam}
                                                        variant="ghost"
                                                        className="w-full justify-between h-10 px-4 hover:bg-primary/5 hover:text-primary group"
                                                        onClick={() => handleExamSelect(exam)}
                                                    >
                                                        <span className="flex items-center gap-2">
                                                            <div className={cn("w-2 h-2 rounded-full", EXAM_COLORS[exam]?.split(' ')[1] || "bg-primary")} />
                                                            {exam}
                                                        </span>
                                                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                                    </Button>
                                                ))}
                                            </div>
                                        </ScrollArea>
                                    </div>
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/30 p-8 text-center">
                                        <Users className="w-12 h-12 mb-2 opacity-20" />
                                        <p className="text-sm">Select a stream to continue</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div >

                {/* Legend Section */}
                < div className="dashboard-card h-full" >
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        Exam Types
                    </h3>
                    <div className="space-y-3">
                        {EXAMS.map((exam) => (
                            <div key={exam} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-transparent hover:border-border transition-colors">
                                <span className="text-sm font-medium">{exam}</span>
                                <div className={cn("px-2 py-1 rounded text-[10px] font-bold uppercase border", EXAM_COLORS[exam])}>
                                    {exam.split(' ')[0]}
                                </div>
                            </div>
                        ))}
                    </div>
                </div >
            </div >

            {/* Timetable Popup - Dynamic */}
            <Dialog open={!!viewTimetable} onOpenChange={(open) => {
                if (!open) {
                    setViewTimetable(null);
                    setTimetableData(null);
                }
            }}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {timetableData ? `${timetableData.exam_display_name} Schedule` : 'Exam Schedule'}
                        </DialogTitle>
                        <DialogDescription>
                            {timetableData
                                ? `Viewing timetable for ${timetableData.class_id} - Section ${timetableData.section}`
                                : 'Fetching schedule details...'}
                        </DialogDescription>
                    </DialogHeader>

                    {isFetchingTimetable ? (
                        <div className="flex flex-col items-center justify-center p-12 space-y-4">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground">Fetching examination schedule...</p>
                        </div>
                    ) : timetableData ? (
                        <ExamSchedulePreview
                            schedule={{
                                id: timetableData.id,
                                exam_type: timetableData.exam_type,
                                exam_display_name: timetableData.exam_display_name,
                                class_id: timetableData.class_id,
                                section: timetableData.section,
                                academic_year: timetableData.academic_year,
                                entries: timetableData.exam_schedule_entries.map((e: any) => ({
                                    id: e.id,
                                    exam_date: new Date(e.exam_date),
                                    day_of_week: e.day_of_week,
                                    start_time: e.start_time,
                                    end_time: e.end_time,
                                    subject: e.subject,
                                    syllabus_notes: e.syllabus_notes,
                                })),
                            }}
                            // onClose removed to hide duplicate X button (DialogContent has its own)
                            onDownload={() => {
                                toast.info("PDF generation started...");
                                // Implement PDF logic here or reuse from manager
                            }}
                            showActions={false}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                                <CalendarIcon className="w-8 h-8 text-muted-foreground opacity-20" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold">No Schedule Found</h3>
                                <p className="text-sm text-muted-foreground">
                                    No examination schedule has been published for Class {selectedExamClass} {selectedGroup ? `- ${selectedGroup}` : ''} ({viewTimetable?.exam}) yet.
                                </p>
                            </div>
                            <Button variant="outline" onClick={() => setViewTimetable(null)}>Close</Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

        </InstitutionLayout >
    );
}
