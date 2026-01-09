import { useState } from 'react';
import { InstitutionLayout } from '@/layouts/InstitutionLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { UserPlus, Save } from 'lucide-react';
import { toast } from 'sonner';

export function InstitutionAddStudent() {
    const [studentData, setStudentData] = useState({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gender: '',
        email: '',
        phone: '',
        parentName: '',
        parentPhone: '',
        parentEmail: '',
        address: '',
        className: '',
        section: '',
        rollNumber: '',
        admissionDate: '',
        bloodGroup: '',
        religion: '',
        category: '',
        previousSchool: '',
    });

    const handleInputChange = (field: string, value: string) => {
        setStudentData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Simulate submission
        toast.success('Student added successfully!');
        console.log('Student Data:', studentData);
        // Reset form
        setStudentData({
            firstName: '',
            lastName: '',
            dateOfBirth: '',
            gender: '',
            email: '',
            phone: '',
            parentName: '',
            parentPhone: '',
            parentEmail: '',
            address: '',
            className: '',
            section: '',
            rollNumber: '',
            admissionDate: '',
            bloodGroup: '',
            religion: '',
            category: '',
            previousSchool: '',
        });
    };

    return (
        <InstitutionLayout>
            <PageHeader
                title="Add New Student"
                subtitle="Register a new student with complete details"
            />

            <div className="dashboard-card p-6">
                <form onSubmit={handleSubmit}>
                    {/* Personal Information */}
                    <div className="mb-8">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <UserPlus className="w-5 h-5 text-primary" />
                            Personal Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="firstName">First Name *</Label>
                                <Input
                                    id="firstName"
                                    value={studentData.firstName}
                                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                                    placeholder="Enter first name"
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="lastName">Last Name *</Label>
                                <Input
                                    id="lastName"
                                    value={studentData.lastName}
                                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                                    placeholder="Enter last name"
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                                <Input
                                    id="dateOfBirth"
                                    type="date"
                                    value={studentData.dateOfBirth}
                                    onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="gender">Gender *</Label>
                                <Select
                                    value={studentData.gender}
                                    onValueChange={(value) => handleInputChange('gender', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select gender" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="male">Male</SelectItem>
                                        <SelectItem value="female">Female</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="bloodGroup">Blood Group</Label>
                                <Select
                                    value={studentData.bloodGroup}
                                    onValueChange={(value) => handleInputChange('bloodGroup', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select blood group" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="A+">A+</SelectItem>
                                        <SelectItem value="A-">A-</SelectItem>
                                        <SelectItem value="B+">B+</SelectItem>
                                        <SelectItem value="B-">B-</SelectItem>
                                        <SelectItem value="O+">O+</SelectItem>
                                        <SelectItem value="O-">O-</SelectItem>
                                        <SelectItem value="AB+">AB+</SelectItem>
                                        <SelectItem value="AB-">AB-</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="religion">Religion</Label>
                                <Input
                                    id="religion"
                                    value={studentData.religion}
                                    onChange={(e) => handleInputChange('religion', e.target.value)}
                                    placeholder="Enter religion"
                                />
                            </div>
                            <div>
                                <Label htmlFor="category">Category</Label>
                                <Select
                                    value={studentData.category}
                                    onValueChange={(value) => handleInputChange('category', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="general">General</SelectItem>
                                        <SelectItem value="obc">OBC</SelectItem>
                                        <SelectItem value="sc">SC</SelectItem>
                                        <SelectItem value="st">ST</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Contact Information */}
                    <div className="mb-8">
                        <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={studentData.email}
                                    onChange={(e) => handleInputChange('email', e.target.value)}
                                    placeholder="student@example.com"
                                />
                            </div>
                            <div>
                                <Label htmlFor="phone">Phone Number</Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    value={studentData.phone}
                                    onChange={(e) => handleInputChange('phone', e.target.value)}
                                    placeholder="+91 XXXXX XXXXX"
                                />
                            </div>
                            <div className="md:col-span-2 lg:col-span-1">
                                <Label htmlFor="address">Address *</Label>
                                <Input
                                    id="address"
                                    value={studentData.address}
                                    onChange={(e) => handleInputChange('address', e.target.value)}
                                    placeholder="Enter full address"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Parent/Guardian Information */}
                    <div className="mb-8">
                        <h3 className="text-lg font-semibold mb-4">Parent/Guardian Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="parentName">Parent/Guardian Name *</Label>
                                <Input
                                    id="parentName"
                                    value={studentData.parentName}
                                    onChange={(e) => handleInputChange('parentName', e.target.value)}
                                    placeholder="Enter parent name"
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="parentPhone">Parent Phone *</Label>
                                <Input
                                    id="parentPhone"
                                    type="tel"
                                    value={studentData.parentPhone}
                                    onChange={(e) => handleInputChange('parentPhone', e.target.value)}
                                    placeholder="+91 XXXXX XXXXX"
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="parentEmail">Parent Email</Label>
                                <Input
                                    id="parentEmail"
                                    type="email"
                                    value={studentData.parentEmail}
                                    onChange={(e) => handleInputChange('parentEmail', e.target.value)}
                                    placeholder="parent@example.com"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Academic Information */}
                    <div className="mb-8">
                        <h3 className="text-lg font-semibold mb-4">Academic Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="className">Class *</Label>
                                <Select
                                    value={studentData.className}
                                    onValueChange={(value) => handleInputChange('className', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select class" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Grade 1">Grade 1</SelectItem>
                                        <SelectItem value="Grade 2">Grade 2</SelectItem>
                                        <SelectItem value="Grade 3">Grade 3</SelectItem>
                                        <SelectItem value="Grade 4">Grade 4</SelectItem>
                                        <SelectItem value="Grade 5">Grade 5</SelectItem>
                                        <SelectItem value="Grade 6">Grade 6</SelectItem>
                                        <SelectItem value="Grade 7">Grade 7</SelectItem>
                                        <SelectItem value="Grade 8">Grade 8</SelectItem>
                                        <SelectItem value="Grade 9">Grade 9</SelectItem>
                                        <SelectItem value="Grade 10">Grade 10</SelectItem>
                                        <SelectItem value="Grade 11">Grade 11</SelectItem>
                                        <SelectItem value="Grade 12">Grade 12</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="section">Section *</Label>
                                <Select
                                    value={studentData.section}
                                    onValueChange={(value) => handleInputChange('section', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select section" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="A">A</SelectItem>
                                        <SelectItem value="B">B</SelectItem>
                                        <SelectItem value="C">C</SelectItem>
                                        <SelectItem value="D">D</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="rollNumber">Roll Number *</Label>
                                <Input
                                    id="rollNumber"
                                    value={studentData.rollNumber}
                                    onChange={(e) => handleInputChange('rollNumber', e.target.value)}
                                    placeholder="Enter roll number"
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="admissionDate">Admission Date *</Label>
                                <Input
                                    id="admissionDate"
                                    type="date"
                                    value={studentData.admissionDate}
                                    onChange={(e) => handleInputChange('admissionDate', e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="previousSchool">Previous School</Label>
                                <Input
                                    id="previousSchool"
                                    value={studentData.previousSchool}
                                    onChange={(e) => handleInputChange('previousSchool', e.target.value)}
                                    placeholder="Enter previous school name"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={() => window.history.back()}>
                            Cancel
                        </Button>
                        <Button type="submit" className="flex items-center gap-2">
                            <Save className="w-4 h-4" />
                            Add Student
                        </Button>
                    </div>
                </form>
            </div>
        </InstitutionLayout>
    );
}
