import {
  CalendarDays,
  ImageIcon,
  LayoutDashboard,
  NotebookPen,
  Settings,
  StickyNote,
} from "lucide-react";

export const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/memories", label: "Memories", icon: ImageIcon },
  { href: "/journal", label: "Journal", icon: NotebookPen },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/notes", label: "Notes", icon: StickyNote },
  { href: "/settings", label: "Settings", icon: Settings },
];
