import {
  Banknote,
  BookOpenCheck,
  CalendarDays,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Music2,
  Piano,
  ShieldCheck,
  SquareLibrary,
  UserCog,
  Users,
} from "lucide-react";

import type { AppRole } from "@/lib/roles";

export const appNavigation = [
  {
    label: "Overview",
    href: "/",
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
    roles: ["System Manager", "Academic Staff"],
  },
  {
    label: "Studio Rooms",
    href: "/studio-rooms",
    icon: Piano,
    roles: ["System Manager", "Academic Staff"],
  },
  {
    label: "Courses",
    href: "/courses",
    icon: SquareLibrary,
    roles: ["System Manager", "Academic Staff"],
  },
  {
    label: "Instructors",
    href: "/instructors",
    icon: Users,
    roles: ["System Manager", "Academic Staff"],
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
    label: "Lesson Packages",
    href: "/lesson-packages",
    icon: CalendarDays,
    roles: ["System Manager", "Academic Staff", "Music Instructor", "Student Portal User", "Parent Portal User"],
  },
  {
    label: "Schedules",
    href: "/schedules",
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
    roles: ["System Manager", "Academic Staff", "Music Instructor"],
  },
  {
    label: "Billing",
    href: "/billing",
    icon: Banknote,
    roles: ["System Manager", "Academic Staff", "Student Portal User", "Parent Portal User"],
  },
  {
    label: "Reports",
    href: "/reports",
    icon: ShieldCheck,
    roles: ["System Manager", "Academic Staff", "Student Portal User", "Parent Portal User"],
  },
];

export function getNavigationForRole(role?: string) {
  return appNavigation.filter((item) => item.roles.includes(role as AppRole));
}
