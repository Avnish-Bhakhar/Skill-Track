export const number = (value) => (value === null || value === undefined ? "n/a" : value.toLocaleString("en-IN"));

export const percent = (value) => (value === null || value === undefined ? "n/a" : `${value}%`);

export const rupees = (value) =>
  value === null || value === undefined ? "n/a" : `${value < 0 ? "-" : ""}Rs ${Math.round(Math.abs(value)).toLocaleString("en-IN")}`;

export const signed = (value, suffix = "") =>
  value === null || value === undefined ? "n/a" : `${value > 0 ? "+" : ""}${value.toLocaleString("en-IN")}${suffix}`;

export const date = (value) =>
  value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "n/a";

export const monthLabel = (key) =>
  new Date(`${key}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "short", year: "2-digit", timeZone: "UTC" });

export const STATUS = {
  EMPLOYED: "Employed",
  SELF_EMPLOYED: "Self-employed",
  NOT_EMPLOYED: "Not employed",
};

export const SECTOR = { electrician: "Electrician", solar: "Solar installation", retail: "Retail sales" };
