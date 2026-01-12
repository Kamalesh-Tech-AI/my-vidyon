import { useState } from 'react';
import { InstitutionLayout } from '@/layouts/InstitutionLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { FileText, Download, Eye, Calendar as CalendarIcon, Search, Loader2, Plus, X } from 'lucide-react';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { addDays, format, isWithinInterval, parse } from "date-fns";
import { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const initialReports = [
    { id: '1', name: 'Annual Academic Report 2025', type: 'Academic', date: 'Dec 15, 2025', size: '2.4 MB', format: 'PDF' },
    { id: '2', name: 'Financial Audit Q3', type: 'Financial', date: 'Dec 10, 2025', size: '1.8 MB', format: 'Excel' },
    { id: '3', name: 'Faculty Performance Review', type: 'HR', date: 'Dec 05, 2025', size: '3.1 MB', format: 'PDF' },
    { id: '4', name: 'Student Satisfaction Survey', type: 'Feedback', date: 'Nov 28, 2025', size: '1.2 MB', format: 'PDF' },
    { id: '5', name: 'Admission Statistics 2025-26', type: 'Administrative', date: 'Nov 20, 2025', size: '4.5 MB', format: 'Excel' },
];

export function InstitutionReports() {
    const [reports, setReports] = useState(initialReports);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [date, setDate] = useState<DateRange | undefined>();
    const [categoryFilter, setCategoryFilter] = useState("all");

    // Get unique categories from reports
    const uniqueCategories = Array.from(new Set(reports.map(r => r.type)));

    const [newReport, setNewReport] = useState({
        name: '',
        type: '',
        format: ''
    });

    const filteredReports = reports.filter(report => {
        const matchesSearch = report.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            report.type.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === "all" || report.type === categoryFilter;

        let matchesDate = true;
        if (date?.from && date?.to) {
            try {
                const reportDate = parse(report.date, 'MMM d, yyyy', new Date());
                const start = new Date(date.from); start.setHours(0, 0, 0, 0);
                const end = new Date(date.to); end.setHours(23, 59, 59, 999);
                if (date.from && date.to) {
                    matchesDate = isWithinInterval(reportDate, { start, end });
                }
            } catch (e) {
                console.error("Date parsing error", e);
            }
        }

        return matchesSearch && matchesDate && matchesCategory;
    });

    const handleGenerateReport = () => {
        setIsSubmitting(true);
        setTimeout(() => {
            const report = {
                id: (reports.length + 1).toString(),
                name: newReport.name,
                type: newReport.type,
                date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
                size: (Math.random() * 5 + 0.5).toFixed(1) + ' MB',
                format: newReport.format
            };
            setReports([report, ...reports]);
            setIsSubmitting(false);
            setIsAddDialogOpen(false);
            setNewReport({ name: '', type: '', format: '' });
            toast.success("Report generated successfully");
        }, 2000);
    };

    const columns = [
        {
            key: 'name',
            header: 'Report Name',
            render: (item: typeof reports[0]) => (
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded text-primary">
                        <FileText className="w-4 h-4" />
                    </div>
                    <span className="font-medium">{item.name}</span>
                </div>
            ),
        },
        { key: 'type', header: 'Category' },
        { key: 'date', header: 'Generated Date' },
        { key: 'size', header: 'File Size' },
        { key: 'format', header: 'Format' },
        {
            key: 'actions',
            header: 'Actions',
            render: () => (
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                        <Download className="w-4 h-4" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <InstitutionLayout>
            <PageHeader
                title="Reports"
                subtitle="Access and generate institutional reports and documentation"
                actions={
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search reports..."
                                className="input-field pl-10 w-64"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    id="date"
                                    variant={"outline"}
                                    className={cn(
                                        "min-w-[180px] justify-start text-left font-normal gap-2",
                                        !date && categoryFilter === "all" && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="h-4 w-4 flex-shrink-0" />
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {categoryFilter !== "all" && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium">
                                                {categoryFilter}
                                            </span>
                                        )}
                                        {date?.from ? (
                                            date.to ? (
                                                <span className="text-sm">
                                                    {format(date.from, "MMM dd")} - {format(date.to, "MMM dd, yyyy")}
                                                </span>
                                            ) : (
                                                <span className="text-sm">{format(date.from, "MMM dd, yyyy")}</span>
                                            )
                                        ) : (
                                            !categoryFilter || categoryFilter === "all" ? (
                                                <span>Filters</span>
                                            ) : null
                                        )}
                                    </div>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-4" align="end">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <h4 className="font-medium text-sm text-muted-foreground">Filter by Category</h4>
                                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="All Categories" />
                                            </SelectTrigger>
                                            <SelectContent position="popper">
                                                <SelectItem value="all">All Categories</SelectItem>
                                                {uniqueCategories.map((cat) => (
                                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="border-t pt-4">
                                        <Calendar
                                            initialFocus
                                            mode="range"
                                            defaultMonth={date?.from}
                                            selected={date}
                                            onSelect={setDate}
                                            numberOfMonths={2}
                                        />
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                        {(date?.from || searchQuery || categoryFilter !== "all") && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    setDate(undefined);
                                    setSearchQuery('');
                                    setCategoryFilter("all");
                                }}
                                title="Clear filters"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        )}
                        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                            <DialogTrigger asChild>
                                <Button className="flex items-center gap-2">
                                    <Plus className="w-4 h-4" />
                                    Generate New Report
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                    <DialogTitle>Generate Report</DialogTitle>
                                    <DialogDescription>
                                        Select report parameters to generate a new document.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="name" className="text-right">Name</Label>
                                        <Input
                                            id="name"
                                            value={newReport.name}
                                            onChange={(e) => setNewReport({ ...newReport, name: e.target.value })}
                                            className="col-span-3"
                                            placeholder="e.g. Q4 Financial Summary"
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="type" className="text-right">Type</Label>
                                        <div className="col-span-3">
                                            <Select
                                                value={newReport.type}
                                                onValueChange={(value) => setNewReport({ ...newReport, type: value })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Academic">Academic</SelectItem>
                                                    <SelectItem value="Financial">Financial</SelectItem>
                                                    <SelectItem value="HR">HR</SelectItem>
                                                    <SelectItem value="Administrative">Administrative</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="format" className="text-right">Format</Label>
                                        <div className="col-span-3">
                                            <Select
                                                value={newReport.format}
                                                onValueChange={(value) => setNewReport({ ...newReport, format: value })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select format" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="PDF">PDF</SelectItem>
                                                    <SelectItem value="Excel">Excel</SelectItem>
                                                    <SelectItem value="CSV">CSV</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="submit" onClick={handleGenerateReport} disabled={!newReport.name || !newReport.type || !newReport.format || isSubmitting}>
                                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Generate
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {[
                    { label: 'Total Reports', value: '124', icon: FileText, color: 'text-primary' },
                    { label: 'Generated this Month', value: '18', icon: CalendarIcon, color: 'text-info' },
                    { label: 'Downloads this Week', value: '86', icon: Download, color: 'text-success' },
                ].map((stat, idx) => (
                    <div key={idx} className="dashboard-card flex items-center gap-4">
                        <div className={`p-3 rounded-xl bg-muted/50 ${stat.color}`}>
                            <stat.icon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">{stat.label}</p>
                            <h4 className="text-2xl font-bold">{stat.value}</h4>
                        </div>
                    </div>
                ))}
            </div>

            <div className="dashboard-card">
                <DataTable columns={columns} data={filteredReports} />
            </div>
        </InstitutionLayout>
    );
}
