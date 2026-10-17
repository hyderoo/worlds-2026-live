import type { Metadata } from "next";
import { CalendarView } from "@/components/calendar-view";

export const metadata: Metadata = { title: "Calendar sync", description: "Subscribe to Worlds 2026 matches in Google Calendar or Apple Calendar.", alternates: { canonical: "/calendar" } };

export default function Page() {
  return <CalendarView />;
}
