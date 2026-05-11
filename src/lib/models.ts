export type ResourceName =
  | "instruments"
  | "students"
  | "guardians"
  | "instructors"
  | "courses"
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
  emailAddress: string;
  mobileNumber: string;
  user: string;
};

export type Student = BaseRecord & {
  firstName: string;
  lastName: string;
  primaryInstrumentId: string;
  secondaryInstrumentIds: string[];
  skillLevel: "Beginner" | "Intermediate" | "Advanced";
  learningGoal: string;
  preferredLessonMode: "Studio" | "Home Visit";
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

export type StudioRoom = BaseRecord & {
  roomName: string;
  capacity: number;
  instrumentIds: string[];
  isActive: boolean;
};

export type CourseSchedule = BaseRecord & {
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
  recurringPattern: "None" | "Weekly" | "Biweekly" | "Monthly";
  recurrenceEndDate: string;
  scheduleStatus: "Scheduled" | "Completed" | "Cancelled" | "Rescheduled";
  originalScheduleId: string;
  rescheduleReason: string;
};

export type StudentAttendance = BaseRecord & {
  studentId: string;
  courseScheduleId: string;
  instrumentId: string;
  date: string;
  status: "Present" | "Absent" | "Sick" | "Permission" | "Late" | "Rescheduled";
  absenceReason: string;
  makeupRequired: boolean;
  makeupScheduleId: string;
  parentNotified: boolean;
  absenceAlertKey: string;
};

export type InstructorAttendance = BaseRecord & {
  instructorId: string;
  courseScheduleId: string;
  attendanceDate: string;
  instrumentId: string;
  status: "Present" | "Absent" | "Substitute" | "Cancelled";
  substituteInstructorId: string;
  notes: string;
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
  billingPeriod: string;
  lessonPackage: string;
  amount: number;
  dueDate: string;
  status: "Draft" | "Unpaid" | "Paid" | "Overdue";
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
