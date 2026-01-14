import { useParams, useNavigate } from 'react-router-dom';
import { FacultyLayout } from '@/layouts/FacultyLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/common/Badge';
import { ArrowLeft, Mail, Phone, MapPin, Calendar, Award, TrendingUp, BookOpen } from 'lucide-react';

const studentData: Record<string, any> = {
    '101': { id: 1, rollNo: '101', name: 'John Smith', class: 'Grade 10-A', parent: 'Robert Smith', contact: '+91 98765 43210', attendance: '95%', house: 'Blue', email: 'john.smith@student.edu', address: '123 Main St, City', dob: 'Jan 15, 2010', bloodGroup: 'O+', avgGrade: '92%' },
    '102': { id: 2, rollNo: '102', name: 'Emily Johnson', class: 'Grade 10-A', parent: 'Sarah Johnson', contact: '+91 98765 43211', attendance: '88%', house: 'Red', email: 'emily.johnson@student.edu', address: '456 Oak Ave, City', dob: 'Mar 22, 2010', bloodGroup: 'A+', avgGrade: '88%' },
    '103': { id: 3, rollNo: '103', name: 'Michael Brown', class: 'Grade 10-A', parent: 'David Brown', contact: '+91 98765 43212', attendance: '92%', house: 'Green', email: 'michael.brown@student.edu', address: '789 Pine Rd, City', dob: 'Jul 8, 2010', bloodGroup: 'B+', avgGrade: '90%' },
    '104': { id: 4, rollNo: '104', name: 'Sarah Davis', class: 'Grade 10-A', parent: 'Linda Davis', contact: '+91 98765 43213', attendance: '75%', house: 'Yellow', email: 'sarah.davis@student.edu', address: '321 Elm St, City', dob: 'Nov 30, 2010', bloodGroup: 'AB+', avgGrade: '78%' },
    '105': { id: 5, rollNo: '105', name: 'James Wilson', class: 'Grade 10-A', parent: 'Mary Wilson', contact: '+91 98765 43214', attendance: '98%', house: 'Blue', email: 'james.wilson@student.edu', address: '654 Maple Dr, City', dob: 'May 12, 2010', bloodGroup: 'O-', avgGrade: '95%' },
};

export function StudentProfile() {
    const { rollNo } = useParams();
    const navigate = useNavigate();
    const student = rollNo ? studentData[rollNo] : null;

    if (!student) {
        return (
            <FacultyLayout>
                <div className="flex flex-col items-center justify-center min-h-[60vh]">
                    <h2 className="text-2xl font-bold mb-4">Student Not Found</h2>
                    <Button onClick={() => navigate('/faculty/students')}>
                        Back to Students
                    </Button>
                </div>
            </FacultyLayout>
        );
    }

    const houseColors: Record<string, string> = {
        Blue: 'bg-blue-500',
        Red: 'bg-red-500',
        Green: 'bg-green-500',
        Yellow: 'bg-yellow-500',
    };

    return (
        <FacultyLayout>
            <PageHeader
                title="Student Profile"
                subtitle="View detailed information about the student"
                actions={
                    <Button variant="outline" onClick={() => navigate('/faculty/students')}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Students
                    </Button>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Profile Card */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="dashboard-card">
                        <div className="bg-primary/10 h-24 rounded-t-xl -m-6 mb-0"></div>
                        <div className="flex flex-col items-center pt-4">
                            <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center text-3xl font-bold text-primary -mt-16 border-4 border-white">
                                {student.name.split(' ').map((n: string) => n[0]).join('')}
                            </div>
                            <h2 className="text-2xl font-bold mt-4">{student.name}</h2>
                            <p className="text-muted-foreground">Roll No: {student.rollNo}</p>
                            <div className="flex items-center gap-2 mt-2">
                                <div className={`w-3 h-3 rounded-full ${houseColors[student.house]}`} />
                                <span className="text-sm font-medium">{student.house} House</span>
                            </div>
                        </div>

                        <div className="mt-6 space-y-3">
                            <div className="flex items-center gap-3 text-sm">
                                <Mail className="w-4 h-4 text-muted-foreground" />
                                <span className="text-muted-foreground break-all">{student.email}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <Phone className="w-4 h-4 text-muted-foreground" />
                                <span className="text-muted-foreground">{student.contact}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <MapPin className="w-4 h-4 text-muted-foreground" />
                                <span className="text-muted-foreground">{student.address}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <span className="text-muted-foreground">DOB: {student.dob}</span>
                            </div>
                        </div>

                        <div className="mt-6 pt-6 border-t">
                            <Button className="w-full" onClick={() => window.location.href = `mailto:${student.email}`}>
                                <Mail className="w-4 h-4 mr-2" />
                                Send Email
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Details Section */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Academic Overview */}
                    <div className="dashboard-card">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-primary" />
                            Academic Overview
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-primary/5 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingUp className="w-4 h-4 text-primary" />
                                    <span className="text-sm text-muted-foreground">Attendance</span>
                                </div>
                                <p className="text-2xl font-bold">{student.attendance}</p>
                            </div>
                            <div className="bg-success/5 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Award className="w-4 h-4 text-success" />
                                    <span className="text-sm text-muted-foreground">Average Grade</span>
                                </div>
                                <p className="text-2xl font-bold">{student.avgGrade}</p>
                            </div>
                            <div className="bg-info/5 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <BookOpen className="w-4 h-4 text-info" />
                                    <span className="text-sm text-muted-foreground">Class</span>
                                </div>
                                <p className="text-xl font-bold">{student.class}</p>
                            </div>
                        </div>
                    </div>

                    {/* Personal Information */}
                    <div className="dashboard-card">
                        <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-muted-foreground">Full Name</label>
                                <p className="font-medium">{student.name}</p>
                            </div>
                            <div>
                                <label className="text-sm text-muted-foreground">Roll Number</label>
                                <p className="font-medium">{student.rollNo}</p>
                            </div>
                            <div>
                                <label className="text-sm text-muted-foreground">Date of Birth</label>
                                <p className="font-medium">{student.dob}</p>
                            </div>
                            <div>
                                <label className="text-sm text-muted-foreground">Blood Group</label>
                                <p className="font-medium">{student.bloodGroup}</p>
                            </div>
                            <div>
                                <label className="text-sm text-muted-foreground">Class</label>
                                <p className="font-medium">{student.class}</p>
                            </div>
                            <div>
                                <label className="text-sm text-muted-foreground">House</label>
                                <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full ${houseColors[student.house]}`} />
                                    <p className="font-medium">{student.house}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Parent/Guardian Information */}
                    <div className="dashboard-card">
                        <h3 className="text-lg font-semibold mb-4">Parent/Guardian Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-muted-foreground">Parent Name</label>
                                <p className="font-medium">{student.parent}</p>
                            </div>
                            <div>
                                <label className="text-sm text-muted-foreground">Contact Number</label>
                                <p className="font-medium">{student.contact}</p>
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-sm text-muted-foreground">Address</label>
                                <p className="font-medium">{student.address}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </FacultyLayout>
    );
}
