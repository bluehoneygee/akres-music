export const instrumentCategoryOptions = [
  "Piano",
  "Strings",
  "Vocal",
  "Guitar",
  "Drums",
  "Woodwind",
  "Brass",
  "Theory",
  "Other",
].map((value) => ({ label: value, value }));

export const levelOptions = ["Beginner", "Intermediate", "Advanced"].map((value) => ({
  label: value,
  value,
}));

export const lessonModeOptions = ["Studio", "Home Visit"].map((value) => ({
  label: value,
  value,
}));

export const scheduleStatusOptions = [
  "Scheduled",
  "Completed",
  "Cancelled",
  "Rescheduled",
].map((value) => ({ label: value, value }));

export const studentAttendanceStatusOptions = [
  "Present",
  "Absent",
  "Sick",
  "Permission",
  "Late",
  "Rescheduled",
].map((value) => ({ label: value, value }));

export const instructorAttendanceStatusOptions = [
  "Present",
  "Absent",
  "Substitute",
  "Cancelled",
].map((value) => ({ label: value, value }));

export const progressRatingOptions = ["Needs Work", "Improving", "Good", "Excellent"].map(
  (value) => ({ label: value, value }),
);

export const invoiceStatusOptions = ["Draft", "Unpaid", "Paid", "Overdue"].map((value) => ({
  label: value,
  value,
}));
