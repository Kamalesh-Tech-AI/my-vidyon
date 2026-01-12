import { useState } from 'react';
import { InstitutionLayout } from '@/layouts/InstitutionLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/common/Badge';
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, Loader2, BookOpen, Users, FileText, Download, Clock, Filter, Trash2 } from 'lucide-react';
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const initialEvents = [
    { id: '1', title: 'New Academic Session', date: 'Apr 01, 2026', type: 'academic', category: 'Major Event' },
    { id: '2', title: 'Mid-Term 1', date: 'Jul 20-25, 2026', type: 'exam', category: 'Mid-Term 1' },
    { id: '3', title: 'Onam Celebrations', date: 'Aug 26, 2026', type: 'cultural', category: 'Celebration' },
    { id: '4', title: 'Quarterly Exams', date: 'Sep 15-25, 2026', type: 'exam', category: 'Quarterly' },
    { id: '5', title: 'Diwali Celebration', date: 'Nov 08, 2026', type: 'cultural', category: 'Celebration' },
    { id: '6', title: 'Annual Sports Day', date: 'Nov 14, 2026', type: 'cultural', category: 'Event' },
    { id: '7', title: 'Half-yearly Exams', date: 'Dec 10-22, 2026', type: 'exam', category: 'Half-yearly' },
    { id: '8', title: 'Pongal Celebrations', date: 'Jan 14, 2027', type: 'cultural', category: 'Celebration' },
    { id: '9', title: 'Model Exams', date: 'Feb 10-20, 2027', type: 'exam', category: 'Model Exam' },
    { id: '10', title: 'Annual Exams', date: 'Mar 15-30, 2027', type: 'exam', category: 'Annual' },
    { id: '11', title: 'Summer Vacation', date: 'May 01 - Jun 30, 2027', type: 'holiday', category: 'Holiday' },
];

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
    const [events, setEvents] = useState(initialEvents);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newEvent, setNewEvent] = useState({
        title: '',
        date: '',
        type: '',
        category: '',
        description: ''
    });

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
    const [currentDate, setCurrentDate] = useState(new Date(2026, 0, 1));
    const [direction, setDirection] = useState<'next' | 'prev'>('next');
    const [isAnimating, setIsAnimating] = useState(false);

    // New Event Form State
    const [eventBanner, setEventBanner] = useState<File | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [eventToDelete, setEventToDelete] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setEventBanner(e.target.files[0]);
        }
    };

    const handleAddEvent = () => {
        setIsSubmitting(true);
        setTimeout(() => {
            const bannerUrl = eventBanner ? URL.createObjectURL(eventBanner) : null;
            const event: any = {
                id: (events.length + 1).toString(),
                ...newEvent,
                isUserAdded: true,
                banner: bannerUrl
            };
            setEvents([...events, event]);
            setIsSubmitting(false);
            setIsAddDialogOpen(false);
            setNewEvent({ title: '', date: '', type: '', category: '', description: '' });
            setEventBanner(null);
            toast.success("Event added successfully");
        }, 1000);
    };

    const handleDeleteClick = (id: string) => {
        setEventToDelete(id);
        setIsDeleteOpen(true);
    };

    const confirmDelete = () => {
        if (eventToDelete) {
            setEvents(events.filter(e => e.id !== eventToDelete));
            toast.success("Event deleted successfully");
            setIsDeleteOpen(false);
            setEventToDelete(null);
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
                                        Create a new event in the academic calendar.
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
                                        <Input
                                            id="date"
                                            value={newEvent.date}
                                            onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                                            className="col-span-3"
                                            placeholder="e.g. Jan 15, 2026"
                                        />
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
                                            <Input
                                                id="banner"
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileChange}
                                                className="cursor-pointer text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                                            />
                                            {eventBanner && <p className="text-xs text-muted-foreground mt-1">Selected: {eventBanner.name}</p>}
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="submit" onClick={handleAddEvent} disabled={!newEvent.title || !newEvent.date || isSubmitting}>
                                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Save Event
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
                            const dateStr = `${dateObj.toLocaleString('en-US', { month: 'short' })} ${day.toString().padStart(2, '0')}, ${dateObj.getFullYear()}`;

                            const today = new Date();
                            const isToday = day === today.getDate() &&
                                currentDate.getMonth() === today.getMonth() &&
                                currentDate.getFullYear() === today.getFullYear();

                            // Enhanced event matching to handle ranges
                            const dayEvents = events.filter(e => {
                                // Filter Logic
                                if (e.type === 'holiday' && !filterState.showHolidays) return false;
                                // if (e.type === 'exam' && !filterState.showExams) return false; // Always show exams now

                                const eventDate = e.date;

                                // Handle "May 01 - Jun 30, 2027" format
                                if (eventDate.includes(' - ')) {
                                    const [startStr, endStr] = eventDate.split(' - ');
                                    // Simple parser assuming "Mon DD" or "Mon DD, YYYY" format parts might need year handling
                                    // For specific mock data "May 01 - Jun 30, 2027"
                                    const year = parseInt(eventDate.split(', ')[1]) || dateObj.getFullYear();
                                    const start = new Date(`${startStr}, ${year}`);
                                    const end = new Date(endStr); // endStr usually has the year "Jun 30, 2027"

                                    // Reset times for comparison
                                    start.setHours(0, 0, 0, 0);
                                    end.setHours(0, 0, 0, 0);
                                    const check = new Date(dateObj);
                                    check.setHours(0, 0, 0, 0);

                                    return check >= start && check <= end;
                                }

                                // Handle "Jul 20-25, 2026" format
                                if (eventDate.match(/[a-zA-Z]{3}\s\d{1,2}-\d{1,2},\s\d{4}/)) {
                                    const parts = eventDate.split(' '); // ["Jul", "20-25,", "2026"]
                                    const monthStr = parts[0];
                                    const rangePart = parts[1].replace(',', '');
                                    const yearStr = parts[2];

                                    const [startDay, endDay] = rangePart.split('-').map(Number);

                                    const currentMonthStr = dateObj.toLocaleString('en-US', { month: 'short' });

                                    if (monthStr === currentMonthStr && dateObj.getFullYear().toString() === yearStr) {
                                        const d = dateObj.getDate();
                                        return d >= startDay && d <= endDay;
                                    }
                                    return false;
                                }

                                // Exact Match
                                return e.date === dateStr;
                            });

                            return (
                                <div key={`day-${day}`} className={`bg-background min-h-[100px] p-2 border-t border-r last:border-r-0 hover:bg-muted/30 transition-colors ${isToday ? 'bg-primary/5' : ''}`}>
                                    <div className="flex justify-between items-start">
                                        <span className={`text-sm ${isToday ? 'font-bold text-primary' : ''}`}>{day}</span>
                                    </div>
                                    <div className="space-y-1 mt-1">
                                        {dayEvents.map((event, idx) => {
                                            const colorClass = event.type === 'exam' && EXAM_COLORS[event.category]
                                                ? EXAM_COLORS[event.category]
                                                : event.type === 'holiday'
                                                    ? 'bg-destructive/10 text-destructive border-destructive/20'
                                                    : 'bg-primary/10 text-primary border-primary/20';

                                            return (
                                                <div key={idx} className={`p-1 text-[10px] rounded truncate border ${colorClass}`} title={event.title}>
                                                    {event.title}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Upcoming Events Section - Horizontal Row */}
            <div className="mt-8 dashboard-card shadow-md hover:shadow-lg transition-shadow duration-300">
                <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
                    <CalendarIcon className="w-5 h-5 text-primary" />
                    Upcoming Events
                </h3>

                {events.filter((e: any) => e.isUserAdded).length > 0 ? (
                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-6 px-6">
                        {events
                            .filter((e: any) => e.isUserAdded)
                            .map((event: any, index) => (
                                <div key={index} className="flex-none w-[300px] rounded-xl overflow-hidden border bg-card hover:shadow-md transition-all group relative">
                                    <div className="h-40 bg-muted relative overflow-hidden">
                                        {event.banner ? (
                                            <img src={event.banner} alt={event.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-primary/5">
                                                <CalendarIcon className="w-12 h-12 text-primary/20" />
                                            </div>
                                        )}
                                        <div className="absolute top-2 right-2">
                                            <Badge variant="info" className="bg-background/80 backdrop-blur-sm text-foreground shadow-sm uppercase text-[10px]">{event.type}</Badge>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteClick(event.id)}
                                        className="absolute top-2 left-2 p-1.5 bg-background/80 text-destructive rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-white z-10"
                                        title="Delete Event"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <div className="p-4 bg-card">
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

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <Trash2 className="w-5 h-5" />
                            Delete Event
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this event? This action cannot be undone and the event will be removed for all users (parents, students, faculty).
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:justify-end">
                        <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmDelete}>Delete Event</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* Exam Schedule Section */}
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

            {/* Timetable Popup */}
            {/* Timetable Popup */}
            <Dialog open={!!viewTimetable} onOpenChange={(open) => !open && setViewTimetable(null)}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            {viewTimetable?.exam} Examination Schedule
                        </DialogTitle>
                        <DialogDescription>
                            Class {selectedExamClass} {selectedGroup ? `- ${selectedGroup}` : ''} • Academic Year 2025-2026
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-4 border rounded-xl overflow-hidden shadow-sm bg-card">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="bg-muted/50 text-muted-foreground font-medium border-b">
                                <tr>
                                    <th className="p-4 font-semibold uppercase text-xs tracking-wider">Date & Day</th>
                                    <th className="p-4 font-semibold uppercase text-xs tracking-wider">Time</th>
                                    <th className="p-4 font-semibold uppercase text-xs tracking-wider">Subject</th>
                                    <th className="p-4 font-semibold uppercase text-xs tracking-wider">Syllabus / Notes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {[
                                    { date: '10 May 2026', day: 'Monday', time: '09:00 AM - 12:00 PM', subject: 'Mathematics', notes: 'Chapters 1-5' },
                                    { date: '12 May 2026', day: 'Wednesday', time: '09:00 AM - 12:00 PM', subject: 'Physics', notes: 'Thermodynamics & Motion' },
                                    { date: '14 May 2026', day: 'Friday', time: '09:00 AM - 12:00 PM', subject: 'Chemistry', notes: 'Organic Chemistry Basic' },
                                    { date: '17 May 2026', day: 'Monday', time: '09:00 AM - 12:00 PM', subject: 'English', notes: 'Grammar & Composition' },
                                    { date: '19 May 2026', day: 'Wednesday', time: '09:00 AM - 12:00 PM', subject: 'Computer Science', notes: 'Programming Basics' },
                                ].map((row, i) => (
                                    <tr key={i} className="group hover:bg-muted/30 transition-colors">
                                        <td className="p-4">
                                            <div className="font-semibold text-foreground">{row.date}</div>
                                            <div className="text-xs text-muted-foreground">{row.day}</div>
                                        </td>
                                        <td className="p-4 text-muted-foreground whitespace-nowrap">
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5 opacity-70" />
                                                {row.time}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="font-semibold text-primary">{row.subject}</span>
                                        </td>
                                        <td className="p-4 text-muted-foreground">
                                            <div className="flex items-center gap-2">
                                                <BookOpen className="w-3.5 h-3.5 opacity-50" />
                                                {row.notes}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setViewTimetable(null)}>Close</Button>
                        <Button className="gap-2"><Download className="w-4 h-4" /> Download PDF</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </InstitutionLayout >
    );
}

