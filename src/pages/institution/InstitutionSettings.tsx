import { useState } from 'react';
import { InstitutionLayout } from '@/layouts/InstitutionLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Settings as SettingsIcon, Building, Bell, Shield, Globe, Save } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export function InstitutionSettings() {
    const [activeTab, setActiveTab] = useState('general');

    const handleSave = () => {
        toast.success("Settings saved successfully");
    };

    const tabs = [
        { id: 'general', label: 'General Info', icon: Building },
        { id: 'notifications', label: 'Notifications', icon: Bell },
    ];

    return (
        <InstitutionLayout>
            <PageHeader
                title="Settings"
                subtitle="Configure institutional preferences and profile information"
            />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-1 space-y-2">
                    {tabs.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === item.id
                                ? 'bg-primary text-primary-foreground'
                                : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <item.icon className="w-4 h-4" />
                            {item.label}
                        </button>
                    ))}
                </div>

                <div className="lg:col-span-3 space-y-6">
                    {activeTab === 'general' && (
                        <>
                            <div className="dashboard-card pt-6">
                                <h3 className="text-lg font-semibold mb-6">General Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label>Institution Name</Label>
                                        <Input defaultValue="EduBridge University" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Institution Code</Label>
                                        <Input defaultValue="EBU-2025" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Email Address</Label>
                                        <Input type="email" defaultValue="admin@edubridge.edu" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Contact Number</Label>
                                        <Input type="tel" defaultValue="+1 234 567 8900" />
                                    </div>
                                    <div className="md:col-span-2 space-y-2">
                                        <Label>Address</Label>
                                        <textarea className="input-field min-h-[100px]" defaultValue="123 Education Lane, Academic City, State 54321, USA" />
                                    </div>
                                </div>
                            </div>

                            <div className="dashboard-card pt-6">
                                <h3 className="text-lg font-semibold mb-6">Logo & Branding</h3>
                                <div className="flex items-center gap-8">
                                    <div className="w-24 h-24 rounded-2xl bg-muted flex items-center justify-center border-2 border-dashed border-border">
                                        <Building className="w-8 h-8 text-muted-foreground" />
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex gap-3">
                                            <Button size="sm">Upload Logo</Button>
                                            <Button size="sm" variant="outline">Remove</Button>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Recommended size: 512x512px. Supported formats: PNG, JPG, SVG.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="dashboard-card pt-6">
                            <h3 className="text-lg font-semibold mb-6">Notification Preferences</h3>
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Email Notifications</Label>
                                        <p className="text-sm text-muted-foreground">Receive daily summaries and critical alerts via email.</p>
                                    </div>
                                    <Switch defaultChecked />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">SMS Notifications</Label>
                                        <p className="text-sm text-muted-foreground">Receive instant alerts for urgent matters on your phone.</p>
                                    </div>
                                    <Switch />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Leave Request Alerts</Label>
                                        <p className="text-sm text-muted-foreground">Get notified when staff submits leave requests.</p>
                                    </div>
                                    <Switch defaultChecked />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Marketing Emails</Label>
                                        <p className="text-sm text-muted-foreground">Receive updates about new features and promotions.</p>
                                    </div>
                                    <Switch defaultChecked />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mt-8 pt-6 border-t flex justify-end gap-3">
                        <Button variant="outline">Discard Changes</Button>
                        <Button onClick={handleSave} className="flex items-center gap-2">
                            <Save className="w-4 h-4" />
                            Save Changes
                        </Button>
                    </div>
                </div>
            </div>
        </InstitutionLayout>
    );
}
