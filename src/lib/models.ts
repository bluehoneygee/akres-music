export type ResourceName =
  | "instruments"
  | "students"
  | "guardians"
  | "instructors"
  | "courses"
  | "lesson-packages"
  | "rooms"
  | "schedules"
  | "student-attendance"
  | "instructor-attendance"
  | "journals"
  | "repertoires"
  | "invoices"
  | "notifications";

export type BaseRecord = {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export type Instrument = BaseRecord & {
  instrumentName: string;
  instrumentCategory: string;
  isActive: boolean;
};

export type Guardian = BaseRecord & {
  guardianName: string;
  mobileNumber: string;
};

export type Student = BaseRecord & {
  firstName: string;
  lastName: string;
  skillLevel: "Beginner" | "Intermediate" | "Advanced";
  learningGoal: string;
  guardianIds: string[];
  portalEnabled: boolean;
  musicNotes: string;
};

export type Instructor = BaseRecord & {
  instructorName: string;
  instrumentIds: string[];
  levelFrom: "Beginner" | "Intermediate" | "Advanced";
  levelTo: "Beginner" | "Intermediate" | "Advanced";
  portalEnabled: boolean;
};

export type Course = BaseRecord & {
  courseName: string;
  instrumentId: string;
  courseLevel: "Beginner" | "Intermediate" | "Advanced";
  lessonType: "Private";
  durationMinutes: number;
  defaultFee: number;
};

export type LessonPackage = BaseRecord & {
  studentId: string;
  courseId: string;
  instructorId: string;
  instrumentId: string;
  billingPeriod: string;
  lessonStartDate: string;
  lessonDays: string[];
  lessonCount: number;
  fromTime: string;
  toTime: string;
  lessonMode: "Studio" | "Home Visit";
  studioRoomId: string;
  homeVisitAddress: string;
  status: "Active" | "Completed" | "Cancelled";
};

export type StudioRoom = BaseRecord & {
  roomName: string;
  capacity: number;
  instrumentIds: string[];
  isActive: boolean;
};

export type CourseSchedule = BaseRecord & {
  lessonPackageId: string;
  courseId: string;
  studentId: string;
  instructorId: string;
  instrumentId: string;
  scheduleDate: string;
  fromTime: string;
  toTime: string;
  lessonMode: "Studio" | "Home Visit";
  studioRoomId: string;
  homeVisitAddress: string;
  travelNotes: string;
  privateLesson: boolean;
  scheduleMonth: string;
  lessonStartDate: string;
  lessonDays: string[];
  lessonCount: number;
  scheduleStatus: "Scheduled" | "Completed" | "Cancelled" | "Rescheduled";
  originalScheduleId: string;
  rescheduleReason: string;
};

export type StudentAttendance = BaseRecord & {
  lessonPackageId: string;
  studentId: string;
  courseScheduleId: string;
  instrumentId: string;
  date: string;
  status: "Pending" | "Present" | "Absent" | "Sick" | "Permission" | "Late" | "Rescheduled";
  absenceReason: string;
  makeupRequired: boolean;
  makeupScheduleId: string;
  pendingRescheduleDate: string;
  pendingRescheduleFromTime: string;
  pendingRescheduleToTime: string;
  parentNotified: boolean;
  absenceAlertKey: string;
  confirmed: boolean;
  confirmedByUserId: string;
  confirmedByName: string;
  confirmedAt: string;
};

export type InstructorAttendance = BaseRecord & {
  lessonPackageId: string;
  instructorId: string;
  courseScheduleId: string;
  attendanceDate: string;
  instrumentId: string;
  status: "Pending" | "Present" | "Absent" | "Rescheduled" | "Substitute" | "Cancelled";
  substituteInstructorId: string;
  rescheduleRequired: boolean;
  rescheduleScheduleId: string;
  pendingRescheduleDate: string;
  pendingRescheduleFromTime: string;
  pendingRescheduleToTime: string;
  notes: string;
  confirmed: boolean;
  confirmedByUserId: string;
  confirmedByName: string;
  confirmedAt: string;
};

export type LessonJournal = BaseRecord & {
  studentId: string;
  instructorId: string;
  courseScheduleId: string;
  lessonDate: string;
  instrumentId: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  attendanceId: string;
  materialCovered: string;
  techniqueFocus: string;
  repertoireIds: string[];
  homework: string;
  teacherNotes: string;
  progressRating: "Needs Work" | "Improving" | "Good" | "Excellent";
  parentVisible: boolean;
  submittedAt: string;
};

export type Repertoire = BaseRecord & {
  title: string;
  composerArtist: string;
  instrumentId: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  genre: string;
  notes: string;
  isActive: boolean;
};

export type Invoice = BaseRecord & {
  studentId: string;
  instrumentId: string;
  lessonPackageId: string;
  courseId: string;
  billingPeriod: string;
  lessonPackage: string;
  amount: number;
  dueDate: string;
  paidAt: string;
  status: "Unpaid" | "Paid";
  confirmed: boolean;
  confirmedByUserId: string;
  confirmedByName: string;
  confirmedAt: string;
};

export type Notification = BaseRecord & {
  type: "Repeated Absence" | "Consecutive Absence" | "Invoice Reminder";
  targetRole: "Parent Portal User" | "Academic Staff" | "Student Portal User";
  studentId: string;
  invoiceId: string;
  message: string;
  idempotencyKey: string;
  sentAt: string;
};

export type Database = {
  instruments: Instrument[];
  students: Student[];
  guardians: Guardian[];
  instructors: Instructor[];
  courses: Course[];
  "lesson-packages": LessonPackage[];
  rooms: StudioRoom[];
  schedules: CourseSchedule[];
  "student-attendance": StudentAttendance[];
  "instructor-attendance": InstructorAttendance[];
  journals: LessonJournal[];
  repertoires: Repertoire[];
  invoices: Invoice[];
  notifications: Notification[];
};

export type AnyRecord = Database[ResourceName][number];
