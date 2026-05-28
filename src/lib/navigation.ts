import {
  Banknote,
  BellRing,
  BookOpenCheck,
  CalendarClock,
  CalendarDays,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Music2,
  Piano,
  SquareLibrary,
  UserCog,
  Users,
} from "lucide-react";

import type { AppRole } from "@/lib/roles";

export const appNavigation = [
  {
    label: "Notifications",
    href: "/notifications",
    icon: BellRing,
    roles: [
      "System Manager",
      "Academic Staff",
      "Music Instructor",
      "Student Portal User",
      "Parent Portal User",
    ],
  },
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: [
      "System Manager",
      "Academic Staff",
      "Music Instructor",
      "Student Portal User",
      "Parent Portal User",
    ],
  },
  { label: "Users", href: "/users", icon: UserCog, roles: ["System Manager"] },
  {
    label: "Instruments",
    href: "/instruments",
    icon: Music2,
    roles: ["System Manager", "Academic Staff", "Student Portal User", "Parent Portal User"],
  },
  {
    label: "Studio Rooms",
    href: "/studio-rooms",
    icon: Piano,
    roles: ["System Manager", "Academic Staff", "Music Instructor"],
  },
  {
    label: "Courses",
    href: "/courses",
    icon: SquareLibrary,
    roles: ["System Manager", "Academic Staff", "Student Portal User", "Parent Portal User"],
  },
  {
    label: "Instructors",
    href: "/instructors",
    icon: Users,
    roles: ["System Manager", "Academic Staff", "Student Portal User", "Parent Portal User"],
  },
  {
    label: "Instructor Calendar",
    href: "/instructor-calendar",
    icon: CalendarClock,
    roles: ["System Manager", "Academic Staff", "Music Instructor"],
  },
  {
    label: "Students",
    href: "/students",
    icon: GraduationCap,
    roles: ["System Manager", "Academic Staff", "Music Instructor", "Student Portal User", "Parent Portal User"],
  },
  {
    label: "Guardians",
    href: "/guardians",
    icon: Users,
    roles: ["System Manager", "Academic Staff"],
  },
  {
    label: "Student Calendar",
    href: "/student-calendar",
    icon: CalendarClock,
    roles: ["System Manager", "Academic Staff", "Music Instructor", "Student Portal User", "Parent Portal User"],
  },
  {
    label: "Lesson Packages",
    href: "/lesson-packages",
    icon: CalendarDays,
    roles: ["System Manager", "Academic Staff", "Music Instructor", "Student Portal User", "Parent Portal User"],
  },
  {
    label: "Attendance",
    href: "/attendance",
    icon: BookOpenCheck,
    roles: ["System Manager", "Academic Staff", "Music Instructor", "Student Portal User", "Parent Portal User"],
  },
  {
    label: "Journals",
    href: "/journals",
    icon: FileText,
    roles: ["System Manager", "Academic Staff", "Music Instructor", "Student Portal User", "Parent Portal User"],
  },
  {
    label: "Repertoire",
    href: "/repertoires",
    icon: Music2,
    roles: ["System Manager", "Academic Staff", "Music Instructor", "Student Portal User", "Parent Portal User"],
  },
  {
    label: "Billing",
    href: "/billing",
    icon: Banknote,
    roles: ["System Manager", "Academic Staff", "Parent Portal User"],
  },
];

export function getNavigationForRole(role?: string) {
  return appNavigation.filter((item) => item.roles.includes(role as AppRole));
}
