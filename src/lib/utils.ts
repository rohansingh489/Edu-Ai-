import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}

/** Grade from percentage. */
export function gradeFor(percentage: number) {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B+";
  if (percentage >= 60) return "B";
  if (percentage >= 50) return "C";
  if (percentage >= 40) return "D";
  return "F";
}

export function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtDateTime(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

export const MATERIAL_LABEL: Record<string, string> = {
  NOTES: "Notes",
  SUBJECT_MATERIAL: "Subject material",
  PRESENTATION: "Presentation",
  DOCUMENT: "Document",
  QUESTION_PAPER: "Question paper",
  VIDEO: "Video lecture",
};

export const COMPLAINT_LABEL: Record<string, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  REJECTED: "Rejected",
};

export const CATEGORY_LABEL: Record<string, string> = {
  ACADEMIC: "Academic problem",
  ATTENDANCE: "Attendance",
  EXAMINATION: "Examination issue",
  FEE: "Fee problem",
  LIBRARY: "Library service",
  HOSTEL: "Hostel issue",
  TECHNICAL: "Technical problem",
  OTHER: "Other",
};
