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

export const lessonPackageSessionOptions = [
  ["4", "Paket A - 4x per bulan"],
  ["8", "Paket B - 8x per bulan"],
].map(([value, label]) => ({ label, value }));

export const lessonDayOptions = [
  ["1", "Monday"],
  ["2", "Tuesday"],
  ["3", "Wednesday"],
  ["4", "Thursday"],
  ["5", "Friday"],
  ["6", "Saturday"],
  ["0", "Sunday"],
].map(([value, label]) => ({ label, value }));

export const hourlyLessonSlotOptions = Array.from({ length: 26 }, (_, index) => {
  const fromMinutes = 8 * 60 + index * 30;
  const toMinutes = fromMinutes + 60;
  const fromTime = minutesToTime(fromMinutes);
  const toTime = minutesToTime(toMinutes);

  return {
    label: `${fromTime} - ${toTime}`,
    value: fromTime,
    toTime,
  };
});

function minutesToTime(value: number) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export const scheduleStatusOptions = [
  "Scheduled",
  "Completed",
  "Cancelled",
  "Rescheduled",
].map((value) => ({ label: value, value }));

export const lessonPackageStatusOptions = ["Active", "Completed", "Cancelled"].map((value) => ({
  label: value,
  value,
}));

export const studentAttendanceStatusOptions = [
  "Pending",
  "Present",
  "Absent",
  "Sick",
  "Permission",
  "Rescheduled",
].map((value) => ({ label: value, value }));

export const instructorAttendanceStatusOptions = [
  "Pending",
  "Present",
  "Absent",
  "Rescheduled",
  "Substitute",
  "Cancelled",
].map((value) => ({ label: value, value }));

export const progressRatingOptions = ["Needs Work", "Improving", "Good", "Excellent"].map(
  (value) => ({ label: value, value }),
);

export const invoiceStatusOptions = ["Unpaid", "Paid"].map((value) => ({
  label: value,
  value,
}));
