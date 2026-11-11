import type { PortalId } from '@/lib/portals';

export type PortalProfile = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  role: string | null;
  tenantId: string | null;
};

export type PortalStudentClass = {
  id: string | null;
  name: string | null;
  grade: string | null;
  programName: string | null;
};

export type PortalStudent = {
  id: string;
  studentCode: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  address: string | null;
  city: string | null;
  photoUrl: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  guardianEmail: string | null;
  guardianRelationship: string | null;
  enrollmentDate: string | null;
  expectedCompletionDate: string | null;
  status: string | null;
  studentLevel: string | null;
  batchNumber: string | null;
  totalFees: number;
  paidAmount: number;
  outstandingBalance: number;
  attendancePercentage: number;
  averageGrade: number;
  certificateIssued: boolean;
  certificateUrl: string | null;
  class: PortalStudentClass;
};

export type PortalSubject = {
  id: string;
  name: string;
  code: string;
  teacherName: string | null;
  className: string | null;
};

export type PortalTimetableSlot = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subjectName: string | null;
  className: string | null;
  teacherName: string | null;
  roomName: string | null;
};

export type PortalAttendanceSummary = {
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  percentage: number;
};

export type PortalAttendanceDay = {
  id: string;
  date: string;
  status: string | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  lateMinutes: number;
  remarks: string | null;
};

export type PortalAttendanceMonth = {
  month: string;
  present: number;
  absent: number;
  late: number;
  total: number;
};

export type PortalAttendance = {
  summary: PortalAttendanceSummary;
  recent: PortalAttendanceDay[];
  monthly: PortalAttendanceMonth[];
};

export type PortalAssignment = {
  id: string;
  title: string;
  description: string | null;
  subjectName: string | null;
  className: string | null;
  assignedDate: string | null;
  dueDate: string | null;
  maxMarks: number | null;
  attachmentUrl: string | null;
  status: string | null;
  submissionStatus: string | null;
  submittedAt: string | null;
  marksObtained: number | null;
  feedback: string | null;
};

export type PortalGrade = {
  id: string;
  examId: string | null;
  examName: string | null;
  subject: string | null;
  score: number | null;
  maxScore: number | null;
  percentage: number | null;
  grade: string | null;
  remarks: string | null;
  status: string | null;
  gradedAt: string | null;
};

export type PortalExam = {
  id: string;
  name: string;
  examType: string | null;
  subject: string | null;
  className: string | null;
  examDate: string | null;
  startTime: string | null;
  endTime: string | null;
  durationMinutes: number | null;
  totalMarks: number | null;
  passingMarks: number | null;
  status: string | null;
  result: PortalGrade | null;
};

export type PortalInvoice = {
  id: string;
  invoiceNumber: string;
  amount: number;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  issueDate: string | null;
  dueDate: string | null;
  status: string | null;
  description: string | null;
};

export type PortalPayment = {
  id: string;
  paymentNumber: string;
  amount: number;
  paymentDate: string | null;
  paymentMethod: string | null;
  paymentType: string | null;
  status: string | null;
  referenceNumber: string | null;
  receiptUrl: string | null;
};

export type PortalDocument = {
  id: string;
  title: string;
  documentType: string | null;
  url: string;
  issueDate: string | null;
  expiryDate: string | null;
  issuedBy: string | null;
  isVerified: boolean;
};

export type PortalLeave = {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string | null;
  reason: string | null;
  status: string | null;
  rejectionReason: string | null;
  approvedAt: string | null;
  createdAt: string | null;
};

export type PortalEnrollment = {
  id: string;
  className: string | null;
  academicYear: string | null;
  enrollmentDate: string | null;
  status: string | null;
  grade: string | null;
  remarks: string | null;
};

export type PortalCertificate = {
  id: string;
  certificateType: string | null;
  courseName: string | null;
  levelAchieved: string | null;
  issueDate: string | null;
  certificateNumber: string | null;
  certificateUrl: string | null;
  status: string | null;
  notes: string | null;
};

export type PortalStudentData = {
  portal: 'student';
  profile: PortalProfile;
  student: PortalStudent | null;
  subjects: PortalSubject[];
  timetable: PortalTimetableSlot[];
  attendance: PortalAttendance;
  assignments: PortalAssignment[];
  exams: PortalExam[];
  results: PortalGrade[];
  enrollments: PortalEnrollment[];
  certificates: PortalCertificate[];
  finance: {
    invoices: PortalInvoice[];
    payments: PortalPayment[];
    totals: {
      billed: number;
      paid: number;
      outstanding: number;
      overdue: number;
    };
  };
  documents: PortalDocument[];
  leaves: PortalLeave[];
};

export type PortalTeacherClass = {
  id: string;
  name: string;
  grade: string | null;
  studentCount: number;
  isClassTeacher: boolean;
  subjects: { id: string; name: string; code: string }[];
};

export type PortalTeacherStudent = {
  id: string;
  studentCode: string;
  fullName: string;
  className: string | null;
  classId: string | null;
  attendancePercentage: number;
  averageGrade: number;
  status: string | null;
  photoUrl: string | null;
};

export type PortalTeacherSubmission = {
  id: string;
  homeworkId: string;
  homeworkTitle: string;
  className: string | null;
  studentName: string;
  submittedAt: string | null;
  status: string | null;
  marksObtained: number | null;
  feedback: string | null;
  submissionUrl: string | null;
};

export type PortalTeacher = {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  departmentName: string | null;
  qualification: string | null;
  specialization: string | null;
  joinDate: string | null;
  status: string | null;
  photoUrl: string | null;
};

export type PortalMaterial = {
  id: string;
  title: string;
  className: string | null;
  subjectName: string | null;
  lessonDate: string | null;
  objectives: string | null;
  materials: string | null;
  activities: string | null;
  assessment: string | null;
  durationMinutes: number | null;
  status: string | null;
};

export type PortalTeacherData = {
  portal: 'teacher';
  profile: PortalProfile;
  teacher: PortalTeacher | null;
  classes: PortalTeacherClass[];
  students: PortalTeacherStudent[];
  subjects: (PortalSubject & { classId: string | null })[];
  timetable: PortalTimetableSlot[];
  attendance: PortalAttendance & {
    todayDone: number;
    pendingClasses: { classId: string; className: string; studentCount: number }[];
  };
  assignments: (PortalAssignment & {
    submissionCount: number;
    pendingReview: number;
  })[];
  submissions: PortalTeacherSubmission[];
  exams: PortalExam[];
  materials: PortalMaterial[];
  stats: {
    classes: number;
    students: number;
    subjects: number;
    pendingReview: number;
  };
};

export type PortalEmployeeRecord = {
  kind: 'teacher' | 'staff';
  id: string;
  employeeCode: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  department: string | null;
  designation: string | null;
  joinDate: string | null;
  contractType: string | null;
  contractEndDate: string | null;
  status: string | null;
  photoUrl: string | null;
  qualification: string | null;
  specialization: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  address: string | null;
};

export type PortalPayslip = {
  id: string;
  month: number;
  year: number;
  basicSalary: number;
  allowances: Record<string, number>;
  deductions: Record<string, number>;
  bonus: number;
  grossSalary: number;
  netSalary: number;
  overtimePay: number;
  status: string | null;
  paymentDate: string | null;
  paymentMethod: string | null;
  payslipUrl: string | null;
};

export type PortalExpense = {
  id: string;
  category: string;
  subcategory: string | null;
  amount: number;
  expenseDate: string | null;
  description: string | null;
  vendor: string | null;
  status: string | null;
  notes: string | null;
};

export type PortalPerformance = {
  rating: number | null;
  lastEvaluationDate: string | null;
  nextEvaluationDate: string | null;
  attendancePercentage: number;
  leaveDaysTaken: number;
  openTasks: number;
};

export type PortalEmployeeData = {
  portal: 'employee';
  profile: PortalProfile;
  employee: PortalEmployeeRecord | null;
  attendance: PortalAttendance;
  leaves: PortalLeave[];
  leaveBalance: {
    takenDays: number;
    pendingDays: number;
    approvedThisYear: number;
  };
  payslips: PortalPayslip[];
  expenses: PortalExpense[];
  performance: PortalPerformance;
  documents: PortalDocument[];
  tasks: { id: string; title: string; detail: string | null; status: string | null }[];
  schedule: PortalTimetableSlot[];
};

export type PortalLeaveRequest = {
  id: string;
  kind: 'student' | 'employee';
  leaveType: string;
  category: string | null;
  startDate: string;
  endDate: string | null;
  days: number;
  reason: string | null;
  status: string | null;
  rejectionReason: string | null;
  approvedAt: string | null;
  createdAt: string | null;
};

export type PortalLeaveData = {
  portal: 'leave';
  profile: PortalProfile;
  kind: 'student' | 'employee' | null;
  person: {
    id: string;
    name: string | null;
    code: string | null;
    context: string | null;
  } | null;
  requests: PortalLeaveRequest[];
  summary: {
    pending: number;
    approved: number;
    rejected: number;
    total: number;
    approvedDays: number;
    pendingDays: number;
  };
  holidays: PortalHoliday[];
  leaveTypes: { value: string; label: string }[];
  canApprove: boolean;
};

export type PortalDataMap = {
  student: PortalStudentData;
  teacher: PortalTeacherData;
  employee: PortalEmployeeData;
  leave: PortalLeaveData;
};

export type PortalData =
  | PortalStudentData
  | PortalTeacherData
  | PortalEmployeeData
  | PortalLeaveData;

export function isPortalDataFor<P extends PortalId>(
  portal: P,
  data: PortalData | null
): data is PortalDataMap[P] {
  return Boolean(data && data.portal === portal);
}

export type PortalCalendarEntry = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  startDate: string;
  endDate: string | null;
  location: string | null;
  source: 'event' | 'exam' | 'holiday';
};

export type PortalAnnouncement = {
  id: string;
  title: string;
  content: string;
  type: string | null;
  priority: string | null;
  audience: string | null;
  publishDate: string | null;
  expiryDate: string | null;
  isPinned: boolean;
  attachmentUrl: string | null;
  attachmentName: string | null;
};

export type PortalSupportTicket = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  priority: string | null;
  status: string | null;
  resolutionNotes: string | null;
  createdAt: string | null;
  resolvedAt: string | null;
};

export type PortalFeeStructureRow = {
  id: string;
  name: string;
  feeType: string | null;
  amount: number;
  currency: string;
  frequency: string | null;
  dueDay: number | null;
  className: string | null;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  isActive: boolean;
};

export type PortalProgressRow = {
  id: string;
  subject: string | null;
  attendancePercentage: number;
  averageScore: number;
  assignmentsCompleted: number;
  assignmentsTotal: number;
  performanceTrend: string | null;
  updatedAt: string | null;
};

export type PortalExamHistoryRow = {
  id: string;
  examName: string;
  subject: string | null;
  score: number | null;
  maxScore: number | null;
  percentage: number | null;
  grade: string | null;
  examDate: string | null;
  comments: string | null;
};

export type PortalPlacementTest = {
  id: string;
  name: string;
  description: string | null;
  examType: string | null;
  durationMinutes: number | null;
  totalQuestions: number | null;
  passingScore: number | null;
  maxScore: number | null;
  instructions: string | null;
};

export type PortalPlacementAttempt = {
  id: string;
  testName: string;
  score: number | null;
  maxScore: number | null;
  percentage: number | null;
  grade: string | null;
  status: string | null;
  completedAt: string | null;
};

export type PortalLibraryBook = {
  id: string;
  title: string;
  author: string | null;
  category: string | null;
  isbn: string | null;
  publisher: string | null;
  publishYear: number | null;
  quantity: number;
  availableQuantity: number;
  location: string | null;
};

export type PortalLibraryLoan = {
  id: string;
  bookTitle: string;
  issueDate: string | null;
  dueDate: string | null;
  returnDate: string | null;
  status: string | null;
  fineAmount: number;
};

export type PortalDigitalResource = {
  id: string;
  title: string;
  type: string | null;
  subject: string | null;
  author: string | null;
  fileUrl: string | null;
  downloadEnabled: boolean;
};

export type PortalFeedbackEntry = {
  id: string;
  feedbackType: string | null;
  rating: number | null;
  title: string | null;
  comment: string | null;
  isAnonymous: boolean;
  status: string | null;
  response: string | null;
  createdAt: string | null;
};

export type PortalStudentExtras = {
  calendar: PortalCalendarEntry[];
  materials: PortalMaterial[];
  announcements: PortalAnnouncement[];
  support: PortalSupportTicket[];
  feeStructure: PortalFeeStructureRow[];
  progress: PortalProgressRow[];
  examHistory: PortalExamHistoryRow[];
  placementTests: PortalPlacementTest[];
  placementAttempts: PortalPlacementAttempt[];
  library: {
    books: PortalLibraryBook[];
    loans: PortalLibraryLoan[];
    digital: PortalDigitalResource[];
  };
  feedback: PortalFeedbackEntry[];
};

export type PortalTeacherAttendanceRow = {
  id: string;
  studentId: string;
  studentName: string;
  className: string | null;
  classId: string | null;
  date: string;
  status: string | null;
  lateMinutes: number;
  remarks: string | null;
};

export type PortalTeacherGradeRow = {
  id: string;
  studentId: string;
  studentName: string;
  className: string | null;
  classId: string | null;
  examName: string;
  subject: string | null;
  score: number;
  maxScore: number;
  percentage: number | null;
  grade: string | null;
  examDate: string | null;
  comments: string | null;
};

export type PortalTeacherExtras = {
  attendance: PortalTeacherAttendanceRow[];
  grades: PortalTeacherGradeRow[];
  announcements: PortalAnnouncement[];
};

export type PortalTeacherWorkloadClass = {
  classId: string;
  className: string;
  students: number;
  subjects: number;
  weeklySlots: number;
  assignments: number;
  exams: number;
  attendanceAverage: number;
};

export type PortalTeacherWorkload = {
  employeeCode: string | null;
  fullName: string | null;
  totalCourses: number;
  totalClasses: number;
  workloadHours: number;
  maxWorkloadHours: number;
  percentage: number;
  classes: PortalTeacherWorkloadClass[];
};

export type PortalTeacherLeaveRequest = {
  id: string;
  studentId: string;
  studentName: string;
  studentCode: string | null;
  className: string | null;
  startDate: string;
  endDate: string | null;
  reason: string | null;
  status: string | null;
  approvedAt: string | null;
  note: string | null;
};

export type PortalDocumentRequest = {
  id: string;
  documentType: string;
  purpose: string | null;
  status: string | null;
  notes: string | null;
  createdAt: string | null;
  approvedAt: string | null;
  issuedAt: string | null;
};

export type PortalHoliday = {
  id: string;
  name: string;
  date: string;
  description: string | null;
  isRecurring: boolean;
};

export type PortalEmployeeShift = {
  shiftType: string | null;
  contractType: string | null;
  contractEndDate: string | null;
  joinDate: string | null;
};

export type PortalEmployeeExtras = {
  holidays: PortalHoliday[];
  announcements: PortalAnnouncement[];
  requests: PortalSupportTicket[];
  shift: PortalEmployeeShift;
};
