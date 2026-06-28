import { z } from "zod";

import { reportKindSchema } from "@/entities/report";

/**
 * Create-form schemas for the dashboard widget (ADR 0017/0020). These validate the
 * client-side RHF forms; the matching Server Actions re-validate the full write envelope
 * server-side (ADR 0090). Kept slice-local — they cover only what the create forms
 * collect (the action adds `projectId` and the per-kind default config).
 */

const name = z.string().trim().min(1).max(120);

/** New report: a name + which surface it is. */
export const reportFormSchema = z.object({ name, kind: reportKindSchema });
export type ReportFormValues = z.infer<typeof reportFormSchema>;

/** New dashboard: just a name. */
export const dashboardFormSchema = z.object({ name });
export type DashboardFormValues = z.infer<typeof dashboardFormSchema>;
