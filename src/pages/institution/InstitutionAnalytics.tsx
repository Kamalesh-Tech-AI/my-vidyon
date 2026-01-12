import { useState } from 'react';
import { InstitutionLayout } from '@/layouts/InstitutionLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { AreaChart } from '@/components/charts/AreaChart';
import { DonutChart } from '@/components/charts/DonutChart';
import { BarChart } from '@/components/charts/BarChart';
import { Button } from '@/components/ui/button';
import { Download, Calendar, Filter } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// Mock Data Sets
const PERIODS = {
    THIS_YEAR: 'this_year',
    LAST_YEAR: 'last_year',
};

const DATA = {
    [PERIODS.THIS_YEAR]: {
        revenue: [
            { name: 'Jul', value: 8.5 },
            { name: 'Aug', value: 9.2 },
            { name: 'Sep', value: 10.5 },
            { name: 'Oct', value: 11.8 },
            { name: 'Nov', value: 12.1 },
            { name: 'Dec', value: 12.5 },
        ],
        kpis: [
            { label: 'Avg. Retention Rate', value: '94.5%', trend: '+2.1%', status: 'success' },
            { label: 'Faculty-Student Ratio', value: '1:18', trend: 'Stable', status: 'primary' },
            { label: 'Placement Rate', value: '88.2%', trend: '+4.5%', status: 'success' },
            { label: 'Avg. Student GPA', value: '3.42', trend: '-0.1%', status: 'warning' },
        ]
    },
    [PERIODS.LAST_YEAR]: {
        revenue: [
            { name: 'Jul', value: 7.2 },
            { name: 'Aug', value: 7.9 },
            { name: 'Sep', value: 8.4 },
            { name: 'Oct', value: 9.1 },
            { name: 'Nov', value: 9.5 },
            { name: 'Dec', value: 10.2 },
        ],
        kpis: [
            { label: 'Avg. Retention Rate', value: '92.4%', trend: '+1.5%', status: 'success' },
            { label: 'Faculty-Student Ratio', value: '1:20', trend: '-2.0%', status: 'warning' },
            { label: 'Placement Rate', value: '83.7%', trend: '+3.2%', status: 'success' },
            { label: 'Avg. Student GPA', value: '3.38', trend: '+0.2%', status: 'success' },
        ]
    }
};

const studentGrowth = [
    { name: '2021', value: 1800 },
    { name: '2022', value: 2050 },
    { name: '2023', value: 2200 },
    { name: '2024', value: 2350 },
    { name: '2025', value: 2450 },
];

const deptDistribution = [
    { name: 'Engineering', value: 1200 },
    { name: 'Management', value: 800 },
    { name: 'Science', value: 450 },
];

export function InstitutionAnalytics() {
    const [period, setPeriod] = useState(PERIODS.THIS_YEAR);
    const currentData = DATA[period as keyof typeof DATA];

    return (
        <InstitutionLayout>
            <PageHeader
                title="Institutional Analytics"
                subtitle="Detailed insights into institutional performance and growth"
                actions={
                    <div className="flex items-center gap-3">
                        <Select value={period} onValueChange={setPeriod}>
                            <SelectTrigger className="w-[160px] bg-background">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                    <SelectValue />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={PERIODS.THIS_YEAR}>This Year</SelectItem>
                                <SelectItem value={PERIODS.LAST_YEAR}>Last Year</SelectItem>
                            </SelectContent>
                        </Select>

                        <Button variant="outline" className="flex items-center gap-2">
                            <Filter className="w-4 h-4" />
                            Filter
                        </Button>
                        <Button className="flex items-center gap-2">
                            <Download className="w-4 h-4" />
                            Export Report
                        </Button>
                    </div>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="dashboard-card shadow-md transition-shadow hover:shadow-lg">
                    <h3 className="font-semibold mb-6 text-lg flex items-center justify-between">
                        Revenue Growth
                        <span className="text-sm font-normal text-muted-foreground">(in Millions)</span>
                    </h3>
                    <AreaChart data={currentData.revenue} color="hsl(var(--success))" height={300} />
                </div>
                <div className="dashboard-card shadow-md transition-shadow hover:shadow-lg">
                    <h3 className="font-semibold mb-6 text-lg">Student Enrollment Growth</h3>
                    <BarChart data={studentGrowth} color="hsl(var(--institution))" height={300} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="dashboard-card pt-6 shadow-md transition-shadow hover:shadow-lg">
                    <h3 className="font-semibold mb-6">Program Distribution</h3>
                    <div className="h-[300px]">
                        <DonutChart data={deptDistribution} />
                    </div>
                </div>
                <div className="lg:col-span-2 dashboard-card shadow-md transition-shadow hover:shadow-lg">
                    <h3 className="font-semibold mb-6">Key Performance Indicators</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {currentData.kpis.map((kpi, idx) => (
                            <div key={idx} className="p-4 rounded-xl bg-muted/30 border border-transparent hover:border-border transition-colors group">
                                <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider group-hover:text-foreground transition-colors">{kpi.label}</span>
                                <div className="flex items-end justify-between mt-2">
                                    <span className="text-2xl font-bold">{kpi.value}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${kpi.status === 'success' ? 'bg-success/10 text-success' :
                                        kpi.status === 'warning' ? 'bg-warning/10 text-warning' :
                                            'bg-primary/10 text-primary'
                                        }`}>
                                        {kpi.trend}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </InstitutionLayout>
    );
}
