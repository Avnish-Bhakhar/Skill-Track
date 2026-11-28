import { isSalaryBand, SALARY_BANDS, type SalaryBand } from "./salary";

export type JobStatus = "EMPLOYED" | "NOT_EMPLOYED" | "SELF_EMPLOYED";

export interface CheckInData {
  status: JobStatus;
  employer: string | null;
  role: string | null;
  salaryBand: SalaryBand | null;
  salaryMonthly: number | null;
  startMonth: Date | null;
}

export function validateCheckIn(body: unknown, now = new Date()): { data: CheckInData } | { error: string } {
  const input = (body ?? {}) as Record<string, unknown>;
  const text = (key: string) => (typeof input[key] === "string" ? (input[key] as string).trim().slice(0, 120) : "");
  const status = text("status") as JobStatus;
  if (!["EMPLOYED", "NOT_EMPLOYED", "SELF_EMPLOYED"].includes(status)) return { error: "Pick your job status." };
  if (status === "NOT_EMPLOYED") {
    return { data: { status, employer: null, role: null, salaryBand: null, salaryMonthly: null, startMonth: null } };
  }
  if (status === "EMPLOYED" && !text("employer")) return { error: "Tell us who you work for." };
  if (!text("role")) return { error: "Tell us what work you do." };
  const band = text("salaryBand");
  if (!isSalaryBand(band)) return { error: "Pick a salary range." };
  const month = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(text("startMonth"));
  if (!month) return { error: "Pick the month you started." };
  const startMonth = new Date(Date.UTC(+month[1], +month[2] - 1, 1));
  if (startMonth > now || +month[1] < 2000) return { error: "That start month doesn't look right." };
  return {
    data: {
      status,
      employer: text("employer") || null,
      role: text("role"),
      salaryBand: band,
      salaryMonthly: SALARY_BANDS[band],
      startMonth,
    },
  };
}
