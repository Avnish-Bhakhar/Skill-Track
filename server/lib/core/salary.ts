export const SALARY_BANDS = {
  "below-10k": 8000,
  "10k-15k": 12500,
  "15k-20k": 17500,
  "20k-30k": 25000,
  "above-30k": 35000,
} as const;

export type SalaryBand = keyof typeof SALARY_BANDS;

export const isSalaryBand = (value: unknown): value is SalaryBand =>
  typeof value === "string" && Object.hasOwn(SALARY_BANDS, value);

export const bandFor = (amount: number): SalaryBand =>
  amount < 10000 ? "below-10k" : amount < 15000 ? "10k-15k" : amount < 20000 ? "15k-20k" : amount < 30000 ? "20k-30k" : "above-30k";
