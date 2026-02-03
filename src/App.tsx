import { SearchProvider } from "@/context/SearchContext";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AuthProvider } from "@/context/AuthContext";
import { WebSocketProvider } from "@/context/WebSocketContext";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { GenericPage } from "@/components/common/GenericPage";
import { TranslationProvider } from "@/i18n/TranslationContext";
import { InstitutionProvider } from "@/context/InstitutionContext";
import { SkeletonDashboard } from "@/components/common/Skeleton";
import { GlobalLoadingIndicator } from "@/components/common/GlobalLoadingIndicator";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

// Layouts - Keep these eager as they're needed immediately
import { StudentLayout } from "@/layouts/StudentLayout";
import { FacultyLayout } from "@/layouts/FacultyLayout";
import { InstitutionLayout } from "@/layouts/InstitutionLayout";
import { AdminLayout } from "@/layouts/AdminLayout";

// Critical pages - Keep eager for instant access
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { LoginPage } from "./pages/auth/LoginPage";

// Lazy load all dashboard and feature pages for code splitting
// Student Pages - Wrap named exports for lazy loading
const StudentDashboard = lazy(() => import("./pages/student/StudentDashboard").then(m => ({ default: m.StudentDashboard })));
const StudentCourses = lazy(() => import("./pages/student/StudentCourses").then(m => ({ default: m.StudentCourses })));
const StudentAttendance = lazy(() => import("./pages/student/StudentAttendance").then(m => ({ default: m.StudentAttendance })));
const StudentAssignments = lazy(() => import("./pages/student/StudentAssignments").then(m => ({ default: m.StudentAssignments })));
const StudentTimetable = lazy(() => import("./pages/student/StudentTimetable").then(m => ({ default: m.StudentTimetable })));
const StudentGrades = lazy(() => import("./pages/student/StudentGrades").then(m => ({ default: m.StudentGrades })));
const StudentMaterials = lazy(() => import("./pages/student/StudentMaterials").then(m => ({ default: m.StudentMaterials })));
const StudentFees = lazy(() => import("./pages/student/StudentFees").then(m => ({ default: m.StudentFees })));
const StudentCertificates = lazy(() => import("./pages/student/StudentCertificates").then(m => ({ default: m.StudentCertificates })));
const StudentNotifications = lazy(() => import("./pages/student/StudentNotifications").then(m => ({ default: m.StudentNotifications })));
const StudentAITutor = lazy(() => import("./pages/student/StudentAITutor").then(m => ({ default: m.StudentAITutor })));
const StudentSettings = lazy(() => import("./pages/student/StudentSettings").then(m => ({ default: m.StudentSettings })));
const StudentCalendar = lazy(() => import("./pages/student/StudentCalendar").then(m => ({ default: m.StudentCalendar })));

// Faculty Pages - Wrap named exports
const FacultyDashboard = lazy(() => import("./pages/faculty/FacultyDashboard").then(m => ({ default: m.FacultyDashboard })));
const FacultyCourses = lazy(() => import("./pages/faculty/FacultyCourses").then(m => ({ default: m.FacultyCourses })));
const FacultyAttendance = lazy(() => import("./pages/faculty/FacultyAttendance").then(m => ({ default: m.FacultyAttendance })));
const FacultyAssignments = lazy(() => import("./pages/faculty/FacultyAssignments").then(m => ({ default: m.FacultyAssignments })));
const FacultyMarks = lazy(() => import("./pages/faculty/FacultyMarks").then(m => ({ default: m.FacultyMarks })));
const FacultyExams = lazy(() => import("./pages/faculty/FacultyExams").then(m => ({ default: m.FacultyExams })));
const FacultyStudents = lazy(() => import("./pages/faculty/FacultyStudents").then(m => ({ default: m.FacultyStudents })));
const FacultyStudentLeaves = lazy(() => import("@/pages/faculty/FacultyStudentLeaves").then(m => ({ default: m.FacultyStudentLeaves })));
const FacultyAnnouncements = lazy(() => import("./pages/faculty/FacultyAnnouncements").then(m => ({ default: m.FacultyAnnouncements })));
const FacultyNotifications = lazy(() => import("./pages/faculty/FacultyNotifications").then(m => ({ default: m.FacultyNotifications })));
const FacultyLeave = lazy(() => import("./pages/faculty/FacultyLeave").then(m => ({ default: m.FacultyLeave })));
const CreateAssignment = lazy(() => import("./pages/faculty/CreateAssignment").then(m => ({ default: m.CreateAssignment })));
const FacultyUploadCertificate = lazy(() => import("./pages/faculty/FacultyUploadCertificate").then(m => ({ default: m.FacultyUploadCertificate })));
const CreateSubject = lazy(() => import("./pages/faculty/CreateSubject").then(m => ({ default: m.CreateSubject })));
const UploadExamPaper = lazy(() => import("./pages/faculty/UploadExamPaper").then(m => ({ default: m.UploadExamPaper })));
const FacultySettings = lazy(() => import("./pages/faculty/FacultySettings").then(m => ({ default: m.FacultySettings })));
const FacultyCourseDetails = lazy(() => import("./pages/faculty/FacultyCourseDetails").then(m => ({ default: m.FacultyCourseDetails })));
const TimetableManagement = lazy(() => import("./pages/faculty/TimetableManagement").then(m => ({ default: m.TimetableManagement })));
const ReviewSubmission = lazy(() => import("./pages/faculty/ReviewSubmission").then(m => ({ default: m.ReviewSubmission })));
const UpdateAssignment = lazy(() => import("./pages/faculty/UpdateAssignment").then(m => ({ default: m.UpdateAssignment })));
const StudentProfile = lazy(() => import("./pages/faculty/StudentProfile").then(m => ({ default: m.StudentProfile })));
const FacultyCalendar = lazy(() => import("./pages/faculty/FacultyCalendar").then(m => ({ default: m.FacultyCalendar })));
const FacultyScanAttendance = lazy(() => import("./pages/faculty/FacultyScanAttendance").then(m => ({ default: m.FacultyScanAttendance })));

// Institution Pages - Wrap named exports
const InstitutionDashboard = lazy(() => import("./pages/institution/InstitutionDashboard").then(m => ({ default: m.InstitutionDashboard })));
const InstitutionDepartments = lazy(() => import("./pages/institution/InstitutionDepartments").then(m => ({ default: m.InstitutionDepartments })));
const InstitutionCourses = lazy(() => import("./pages/institution/InstitutionCourses").then(m => ({ default: m.InstitutionCourses })));
const InstitutionCalendar = lazy(() => import("./pages/institution/InstitutionCalendar").then(m => ({ default: m.InstitutionCalendar })));
const InstitutionLeaveApproval = lazy(() => import("./pages/institution/InstitutionLeaveApproval").then(m => ({ default: m.InstitutionLeaveApproval })));
const InstitutionNotifications = lazy(() => import("./pages/institution/InstitutionNotifications").then(m => ({ default: m.InstitutionNotifications })));
const InstitutionUsers = lazy(() => import("./pages/institution/InstitutionUsers").then(m => ({ default: m.InstitutionUsers })));
const InstitutionStudentDetails = lazy(() => import("./pages/institution/InstitutionStudentDetails").then(m => ({ default: m.InstitutionStudentDetails })));
const InstitutionAddStudent = lazy(() => import("./pages/institution/InstitutionAddStudent").then(m => ({ default: m.InstitutionAddStudent })));
const InstitutionFees = lazy(() => import("./pages/institution/InstitutionFees").then(m => ({ default: m.InstitutionFees })));
const InstitutionFeeStructure = lazy(() => import("./pages/institution/InstitutionFeeStructure").then(m => ({ default: m.InstitutionFeeStructure })));
const InstitutionAnalytics = lazy(() => import("./pages/institution/InstitutionAnalytics").then(m => ({ default: m.InstitutionAnalytics })));
const InstitutionReports = lazy(() => import("./pages/institution/InstitutionReports").then(m => ({ default: m.InstitutionReports })));
const InstitutionSettings = lazy(() => import("./pages/institution/InstitutionSettings").then(m => ({ default: m.InstitutionSettings })));
const InstitutionTimetable = lazy(() => import("./pages/institution/InstitutionTimetable").then(m => ({ default: m.InstitutionTimetable })));
const InstitutionTimetableEdit = lazy(() => import("./pages/institution/InstitutionTimetableEdit").then(m => ({ default: m.InstitutionTimetableEdit })));
const InstitutionFacultyAssigning = lazy(() => import("./pages/institution/InstitutionFacultyAssigning").then(m => ({ default: m.InstitutionFacultyAssigning })));
const InstitutionStaffAttendance = lazy(() => import("./pages/institution/InstitutionStaffAttendance").then(m => ({ default: m.InstitutionStaffAttendance })));
const FaceRegistration = lazy(() => import("./pages/institution/FaceRegistration").then(m => ({ default: m.FaceRegistration })));

// Parent Pages - Wrap named exports
const ParentDashboard = lazy(() => import("./pages/parent/ParentDashboard").then(m => ({ default: m.ParentDashboard })));
const ParentChildDetail = lazy(() => import("./pages/parent/ParentChildDetail").then(m => ({ default: m.ParentChildDetail })));
const ParentNotifications = lazy(() => import("./pages/parent/ParentNotifications").then(m => ({ default: m.ParentNotifications })));
const ParentFees = lazy(() => import("./pages/parent/ParentFees").then(m => ({ default: m.ParentFees })));
const ParentLeave = lazy(() => import("./pages/parent/ParentLeave").then(m => ({ default: m.ParentLeave })));
const ParentSettings = lazy(() => import("./pages/parent/ParentSettings").then(m => ({ default: m.ParentSettings })));
const ParentCalendar = lazy(() => import("./pages/parent/ParentCalendar").then(m => ({ default: m.ParentCalendar })));

// Admin Pages - Wrap named exports
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard").then(m => ({ default: m.AdminDashboard })));
const AdminInstitutionAnalytics = lazy(() => import("./pages/admin/AdminInstitutionAnalytics").then(m => ({ default: m.AdminInstitutionAnalytics })));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings").then(m => ({ default: m.AdminSettings })));
const AdminStructure = lazy(() => import("./pages/admin/AdminStructure").then(m => ({ default: m.AdminStructure })));
const AdminSubjects = lazy(() => import("./pages/admin/AdminSubjects").then(m => ({ default: m.AdminSubjects })));
const AdminApprovals = lazy(() => import("./pages/admin/AdminApprovals").then(m => ({ default: m.AdminApprovals })));
const AdminAnnouncements = lazy(() => import("./pages/admin/AdminAnnouncements").then(m => ({ default: m.AdminAnnouncements })));
const AdminInstitutions = lazy(() => import("./pages/admin/AdminInstitutions").then(m => ({ default: m.AdminInstitutions })));
const AddInstitution = lazy(() => import("./pages/admin/AddInstitution").then(m => ({ default: m.AddInstitution })));
const InstitutionDetail = lazy(() => import("./pages/admin/InstitutionDetail").then(m => ({ default: m.InstitutionDetail })));
const AdminNotifications = lazy(() => import("./pages/admin/AdminNotifications").then(m => ({ default: m.AdminNotifications })));

// Accountant Pages - Wrap named exports
const AccountantFees = lazy(() => import("./pages/accountant/AccountantFees").then(m => ({ default: m.AccountantFees })));
const AccountantDashboard = lazy(() => import("./pages/accountant/AccountantDashboard").then(m => ({ default: m.AccountantDashboard })));

// Canteen Pages - Wrap named exports
const CanteenDashboard = lazy(() => import("./pages/canteen/CanteenDashboard").then(m => ({ default: m.CanteenDashboard })));
const CanteenSettings = lazy(() => import("./pages/canteen/CanteenSettings").then(m => ({ default: m.CanteenSettings })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes - data stays fresh longer, reduces refetches
      gcTime: 1000 * 60 * 10, // 10 minutes - keep unused data in cache
      refetchOnWindowFocus: false, // Disable automatic refetch on window focus (enable per-query if needed)
      refetchOnReconnect: true, // Refetch when internet connection is restored
      retry: (failureCount, error) => {
        // Exponential backoff retry logic
        if (failureCount > 3) return false;
        // Don't retry on 4xx errors (client errors)
        if (error && typeof error === 'object' && 'status' in error) {
          const status = (error as any).status;
          if (status >= 400 && status < 500) return false;
        }
        return true;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
    },
    mutations: {
      retry: 1, // Retry mutations once on failure
    },
  },
});

const App = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TranslationProvider>
          <TooltipProvider>
            <GlobalLoadingIndicator />
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AuthProvider>
                <WebSocketProvider>
                  <SearchProvider>
                    <InstitutionProvider>
                      <Suspense fallback={<SkeletonDashboard />}>
                        <Routes>
                          {/* Public Routes */}
                          <Route path="/" element={<Index />} />
                          <Route path="/login" element={<LoginPage />} />

                          {/* Student Routes */}
                          <Route path="/student" element={<ProtectedRoute allowedRoles={['student']}><StudentDashboard /></ProtectedRoute>} />
                          <Route path="/student/courses" element={<ProtectedRoute allowedRoles={['student']}><StudentCourses /></ProtectedRoute>} />
                          <Route path="/student/timetable" element={<ProtectedRoute allowedRoles={['student']}><StudentTimetable /></ProtectedRoute>} />
                          <Route path="/student/attendance" element={<ProtectedRoute allowedRoles={['student']}><StudentAttendance /></ProtectedRoute>} />
                          <Route path="/student/assignments" element={<ProtectedRoute allowedRoles={['student']}><StudentAssignments /></ProtectedRoute>} />
                          <Route path="/student/grades" element={<ProtectedRoute allowedRoles={['student']}><StudentGrades /></ProtectedRoute>} />
                          <Route path="/student/materials" element={<ProtectedRoute allowedRoles={['student']}><StudentMaterials /></ProtectedRoute>} />
                          {/* <Route path="/student/fees" element={<ProtectedRoute allowedRoles={['student']}><StudentFees /></ProtectedRoute>} /> */}
                          <Route path="/student/certificates" element={<ProtectedRoute allowedRoles={['student']}><StudentCertificates /></ProtectedRoute>} />
                          <Route path="/student/notifications" element={<ProtectedRoute allowedRoles={['student']}><StudentNotifications /></ProtectedRoute>} />
                          <Route path="/student/ai-tutor" element={<ProtectedRoute allowedRoles={['student']}><StudentAITutor /></ProtectedRoute>} />
                          <Route path="/student/settings" element={<ProtectedRoute allowedRoles={['student']}><StudentSettings /></ProtectedRoute>} />
                          <Route path="/student/calendar" element={<ProtectedRoute allowedRoles={['student']}><StudentCalendar /></ProtectedRoute>} />

                          {/* Faculty Routes */}
                          <Route path="/faculty" element={<ProtectedRoute allowedRoles={['faculty']}><FacultyDashboard /></ProtectedRoute>} />
                          <Route path="/faculty/courses" element={<ProtectedRoute allowedRoles={['faculty']}><FacultyCourses /></ProtectedRoute>} />
                          <Route path="/faculty/courses/:courseId" element={<ProtectedRoute allowedRoles={['faculty']}><FacultyCourseDetails /></ProtectedRoute>} />
                          <Route path="/faculty/attendance" element={<ProtectedRoute allowedRoles={['faculty']}><FacultyAttendance /></ProtectedRoute>} />
                          <Route path="/faculty/assignments" element={<ProtectedRoute allowedRoles={['faculty']}><FacultyAssignments /></ProtectedRoute>} />
                          <Route path="/faculty/assignments/create" element={<ProtectedRoute allowedRoles={['faculty']}><CreateAssignment /></ProtectedRoute>} />
                          <Route path="/faculty/assignments/edit/:id" element={<ProtectedRoute allowedRoles={['faculty']}><UpdateAssignment /></ProtectedRoute>} />
                          <Route path="/faculty/marks" element={<ProtectedRoute allowedRoles={['faculty']}><FacultyMarks /></ProtectedRoute>} />
                          <Route path="/faculty/exams" element={<ProtectedRoute allowedRoles={['faculty']}><FacultyExams /></ProtectedRoute>} />

                          <Route path="/faculty/students" element={<ProtectedRoute allowedRoles={['faculty']}><FacultyStudents /></ProtectedRoute>} />
                          <Route path="/faculty/student-leaves" element={<ProtectedRoute allowedRoles={['faculty']}><FacultyStudentLeaves /></ProtectedRoute>} />
                          <Route path="/faculty/students/:studentId" element={<ProtectedRoute allowedRoles={['faculty', 'institution', 'admin']}><StudentProfile /></ProtectedRoute>} />
                          <Route path="/faculty/notifications" element={<ProtectedRoute allowedRoles={['faculty']}><FacultyNotifications /></ProtectedRoute>} />
                          <Route path="/faculty/announcements" element={<ProtectedRoute allowedRoles={['faculty']}><FacultyAnnouncements /></ProtectedRoute>} />
                          <Route path="/faculty/upload-certificate" element={<ProtectedRoute allowedRoles={['faculty']}><FacultyUploadCertificate /></ProtectedRoute>} />
                          <Route path="/faculty/leave" element={<ProtectedRoute allowedRoles={['faculty']}><FacultyLeave /></ProtectedRoute>} />
                          <Route path="/faculty/courses/create" element={<ProtectedRoute allowedRoles={['faculty']}><CreateSubject /></ProtectedRoute>} />
                          <Route path="/faculty/exams/upload" element={<ProtectedRoute allowedRoles={['faculty']}><UploadExamPaper /></ProtectedRoute>} />
                          <Route path="/faculty/timetable" element={<ProtectedRoute allowedRoles={['faculty']}><TimetableManagement /></ProtectedRoute>} />
                          <Route path="/faculty/review-submission" element={<ProtectedRoute allowedRoles={['faculty']}><ReviewSubmission /></ProtectedRoute>} />
                          <Route path="/faculty/settings" element={<ProtectedRoute allowedRoles={['faculty']}><FacultySettings /></ProtectedRoute>} />
                          <Route path="/faculty/scan-attendance" element={<ProtectedRoute allowedRoles={['faculty']}><FacultyScanAttendance /></ProtectedRoute>} />
                          <Route path="/faculty/calendar" element={<ProtectedRoute allowedRoles={['faculty']}><FacultyCalendar /></ProtectedRoute>} />

                          {/* Institution Routes */}
                          <Route path="/institution" element={<ProtectedRoute allowedRoles={['institution', 'accountant']}><InstitutionDashboard /></ProtectedRoute>} />
                          {/* Accountant Specific Dashboard Route (optional alias if we want strict separation, but /institution is working as shared. 
                          However, prompt asked for new page. Let's add it.) 
                      */}
                          <Route path="/accountant/dashboard" element={<ProtectedRoute allowedRoles={['accountant']}><AccountantDashboard /></ProtectedRoute>} />

                          <Route path="/institution/departments" element={<ProtectedRoute allowedRoles={['institution']}><InstitutionDepartments /></ProtectedRoute>} />
                          <Route path="/institution/courses" element={<ProtectedRoute allowedRoles={['institution']}><InstitutionCourses /></ProtectedRoute>} />
                          {/* <Route path="/institution/faculty" element={<ProtectedRoute allowedRoles={['institution']}><InstitutionFaculty /></ProtectedRoute>} /> */}
                          <Route path="/institution/faculty-assigning" element={<ProtectedRoute allowedRoles={['institution']}><InstitutionFacultyAssigning /></ProtectedRoute>} />
                          <Route path="/institution/calendar" element={<ProtectedRoute allowedRoles={['institution']}><InstitutionCalendar /></ProtectedRoute>} />
                          <Route path="/institution/leave-approval" element={<ProtectedRoute allowedRoles={['institution']}><InstitutionLeaveApproval /></ProtectedRoute>} />
                          <Route path="/institution/notifications" element={<ProtectedRoute allowedRoles={['institution']}><InstitutionNotifications /></ProtectedRoute>} />
                          <Route path="/institution/users" element={<ProtectedRoute allowedRoles={['institution']}><InstitutionUsers /></ProtectedRoute>} />
                          <Route path="/institution/students/:studentId" element={<ProtectedRoute allowedRoles={['institution', 'admin']}><StudentProfile /></ProtectedRoute>} />
                          <Route path="/institution/add-student" element={<ProtectedRoute allowedRoles={['institution']}><InstitutionAddStudent /></ProtectedRoute>} />

                          <Route path="/institution/fees" element={<ProtectedRoute allowedRoles={['institution']}><InstitutionFees /></ProtectedRoute>} />
                          <Route path="/institution/timetable" element={<ProtectedRoute allowedRoles={['institution']}><InstitutionTimetable /></ProtectedRoute>} />
                          <Route path="/institution/timetable/edit/:facultyId" element={<ProtectedRoute allowedRoles={['institution']}><InstitutionTimetableEdit /></ProtectedRoute>} />
                          <Route path="/institution/analytics" element={<ProtectedRoute allowedRoles={['institution', 'accountant']}><InstitutionAnalytics /></ProtectedRoute>} />
                          <Route path="/institution/reports" element={<ProtectedRoute allowedRoles={['institution']}><InstitutionReports /></ProtectedRoute>} />
                          <Route path="/institution/staff-attendance" element={<ProtectedRoute allowedRoles={['institution']}><InstitutionStaffAttendance /></ProtectedRoute>} />
                          <Route path="/institution/settings" element={<ProtectedRoute allowedRoles={['institution']}><InstitutionSettings /></ProtectedRoute>} />

                          {/* Accountant Routes */}
                          <Route path="/accountant" element={<ProtectedRoute allowedRoles={['accountant']}><AccountantFees /></ProtectedRoute>} />
                          <Route path="/accountant/fees" element={<ProtectedRoute allowedRoles={['accountant']}><AccountantFees /></ProtectedRoute>} />
                          <Route path="/accountant/fee-structure" element={<ProtectedRoute allowedRoles={['accountant']}><InstitutionFeeStructure /></ProtectedRoute>} />

                          {/* Canteen Routes */}
                          <Route path="/canteen" element={<ProtectedRoute allowedRoles={['canteen_manager']}><CanteenDashboard /></ProtectedRoute>} />
                          <Route path="/canteen/settings" element={<ProtectedRoute allowedRoles={['canteen_manager']}><CanteenSettings /></ProtectedRoute>} />

                          {/* Parent Routes */}
                          <Route path="/parent" element={<ProtectedRoute allowedRoles={['parent']}><ParentDashboard /></ProtectedRoute>} />
                          <Route path="/parent/child/:studentId" element={<ProtectedRoute allowedRoles={['parent']}><ParentChildDetail /></ProtectedRoute>} />
                          <Route path="/parent/notifications" element={<ProtectedRoute allowedRoles={['parent']}><ParentNotifications /></ProtectedRoute>} />
                          <Route path="/parent/fees" element={<ProtectedRoute allowedRoles={['parent']}><ParentFees /></ProtectedRoute>} />
                          <Route path="/parent/leave" element={<ProtectedRoute allowedRoles={['parent']}><ParentLeave /></ProtectedRoute>} />
                          <Route path="/parent/settings" element={<ProtectedRoute allowedRoles={['parent']}><ParentSettings /></ProtectedRoute>} />
                          <Route path="/parent/calendar" element={<ProtectedRoute allowedRoles={['parent']}><ParentCalendar /></ProtectedRoute>} />

                          {/* Admin Routes */}
                          {/* SaaS Admin Routes */}
                          <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
                          <Route path="/admin/institutions" element={<ProtectedRoute allowedRoles={['admin']}><AdminInstitutions /></ProtectedRoute>} />
                          <Route path="/admin/add-institution" element={<ProtectedRoute allowedRoles={['admin']}><AddInstitution /></ProtectedRoute>} />
                          <Route path="/admin/institutions/:institutionId" element={<ProtectedRoute allowedRoles={['admin']}><InstitutionDetail /></ProtectedRoute>} />

                          <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['admin']}><AdminInstitutionAnalytics /></ProtectedRoute>} />
                          <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['admin']}><AdminSettings /></ProtectedRoute>} />
                          <Route path="/admin/notifications" element={<ProtectedRoute allowedRoles={['admin']}><AdminNotifications /></ProtectedRoute>} />

                          {/* School Admin Routes - Deactivated */}
                          {/* <Route path="/admin/structure" element={<ProtectedRoute allowedRoles={['admin']}><AdminStructure /></ProtectedRoute>} /> */}
                          {/* <Route path="/admin/subjects" element={<ProtectedRoute allowedRoles={['admin']}><AdminSubjects /></ProtectedRoute>} /> */}
                          {/* <Route path="/admin/approvals" element={<ProtectedRoute allowedRoles={['admin']}><AdminApprovals /></ProtectedRoute>} /> */}
                          {/* <Route path="/admin/communication" element={<ProtectedRoute allowedRoles={['admin']}><AdminAnnouncements /></ProtectedRoute>} /> */}

                          {/* Catch-all */}
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </Suspense>
                    </InstitutionProvider>
                  </SearchProvider>
                </WebSocketProvider>
              </AuthProvider>
            </BrowserRouter>
          </TooltipProvider>
        </TranslationProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
