import { monthLabel, number, percent, rupees, signed } from "./format.js";
import { createPage } from "./pdf.js";

const LEFT = 40;
const RIGHT = 555;
const BLUE = "#1a1aa6";
const GREY = "#555555";

const fit = (text, length) => (text.length > length ? `${text.slice(0, length - 1)}.` : text);

export function describeFilters(params, options) {
  const program = options?.programs.find((p) => p.id === params.program)?.name;
  return [
    `District: ${params.district || "all"}`,
    `Program: ${program || "all"}`,
    `Batch: ${params.batch || "all"}`,
    `Enrolled: ${params.from || "start"} to ${params.to || "today"}`,
  ];
}

export function buildReport(data, filters, now = new Date()) {
  const page = createPage();
  const { stats, byProgram, gaps, impact } = data;
  let y = 0;

  const section = (title) => {
    y += 26;
    page.rect(LEFT, y - 11, RIGHT - LEFT, 16, BLUE);
    page.text(LEFT + 6, y, title, { bold: true, color: "#ffffff", size: 10 });
    y += 20;
  };
  const row = (cells, options) => {
    for (const [x, value, align] of cells) page.text(x, y, value, { ...options, align });
    y += 14;
  };

  page.text(LEFT, 50, "Skill Track: skilling summary", { size: 18, bold: true });
  page.text(LEFT, 66, `Prepared ${now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`, { color: GREY });
  page.text(LEFT, 80, fit(`${filters[0]} | ${filters[1]}`, 95), { color: GREY });
  page.text(LEFT, 92, fit(`${filters[2]} | ${filters[3]}`, 95), { color: GREY });
  y = 96;

  section("Headline figures");
  const cards = [
    ["Total trainees", number(stats.trainees)],
    ["Placement rate", percent(stats.placementRate)],
    ["Average salary", rupees(stats.averageSalary)],
    ["Pending check-ins", number(stats.pendingCheckIns)],
  ];
  cards.forEach(([label, value], i) => {
    page.text(LEFT + i * 130, y, label, { color: GREY, size: 8 });
    page.text(LEFT + i * 130, y + 18, value, { bold: true, size: 15 });
  });
  y += 30;
  row([[LEFT, `Placement rate counts the ${stats.reported} trainees who answered. ${stats.noOutcome} have not.`]], { color: GREY, size: 8 });

  section("Placement by program");
  row([[LEFT, "Program"], [250, "Trainees", "right"], [320, "Answered", "right"], [390, "Placed", "right"]], { color: GREY, size: 8 });
  for (const p of byProgram.slice(0, 6)) {
    page.rect(400, y - 7, ((p.rate ?? 0) / 100) * 100, 8, BLUE);
    row([[LEFT, fit(p.program, 30)], [250, number(p.trainees), "right"], [320, number(p.reported), "right"], [390, number(p.placed), "right"], [RIGHT, percent(p.rate), "right"]]);
  }
  if (byProgram.length > 6) row([[LEFT, `${byProgram.length - 6} more programs not shown.`]], { color: GREY, size: 8 });

  section(`Priority skill gaps (${gaps.postingTotal} job postings)`);
  row([[LEFT, "Skill"], [330, "Demand", "right"], [390, "Supply", "right"], [450, "Priority", "right"], [RIGHT, "Taught", "right"]], { color: GREY, size: 8 });
  if (!gaps.priority.length) row([[LEFT, "No gaps in this view."]]);
  for (const g of gaps.priority.slice(0, 6)) {
    row([[LEFT, fit(g.name, 42)], [330, percent(g.demandPct), "right"], [390, percent(g.supplyPct), "right"], [450, String(g.priority), "right"], [RIGHT, g.covered ? "yes" : "NO", "right"]]);
  }

  section("Demand trend: share of postings asking, by month");
  if (!gaps.trend.series.length) row([[LEFT, "No postings, no trend."]]);
  else {
    row([[LEFT, "Skill"], ...gaps.trend.points.map((p, i) => [305 + i * 50, monthLabel(p.month), "right"])], { color: GREY, size: 8 });
    for (const s of gaps.trend.series) {
      row([[LEFT, fit(s.name, 36)], ...gaps.trend.points.map((p, i) => [305 + i * 50, percent(p[s.skillId]), "right"])]);
    }
  }

  section("Impact against comparison group (SAMPLE DATA)");
  row([[LEFT, "Measure"], [330, "Trainees", "right"], [440, "Comparison", "right"], [RIGHT, "Difference", "right"]], { color: GREY, size: 8 });
  const measures = [
    ["Placement rate", impact.placement, percent, " pts"],
    ["Months to first job", impact.monthsToFirstJob, number, " months"],
    ["Monthly salary change", impact.salaryChange, rupees, null],
  ];
  for (const [label, m, format, suffix] of measures) {
    row([[LEFT, label], [330, format(m.participants), "right"], [440, format(m.comparison), "right"], [RIGHT, suffix === null ? `${m.difference > 0 ? "+" : ""}${rupees(m.difference)}` : signed(m.difference, suffix), "right"]]);
  }
  y += 4;
  for (const line of impact.sentence.match(/.{1,95}(\s|$)/g) ?? []) row([[LEFT, line.trim()]], { bold: true });
  row([[LEFT, `${impact.participantCount} trainees with answers, ${impact.comparisonCount} comparison records, weighted by district.`]], { color: GREY, size: 8 });
  row([[LEFT, "The comparison group is generated sample data, so this is an illustration, not proof of cause."]], { color: GREY, size: 8 });

  return page.toBytes();
}
