import { batchFor, DISTRICTS, postingKey } from "./csv";
import { bandFor, SALARY_BANDS } from "./salary";
import { SKILLS, type Sector } from "./taxonomyData";

export interface NameSource {
  firstName(): string;
  lastName(): string;
}

export const PROGRAMS: { id: string; name: string; sector: Sector; durationMonths: number }[] = [
  { id: "prog-electrician", name: "Domestic Electrician", sector: "electrician", durationMonths: 4 },
  { id: "prog-solar", name: "Solar PV Installer", sector: "solar", durationMonths: 3 },
  { id: "prog-retail", name: "Retail Sales Associate", sector: "retail", durationMonths: 3 },
];

const CURRICULUM: Record<Sector, string[]> = {
  electrician: [
    "house-wiring", "conduit-installation", "switchboard-assembly", "distribution-board-installation", "lighting-installation",
    "earthing", "mcb-and-rccb-selection", "multimeter-use", "fault-finding", "electrical-safety", "motor-winding",
    "wiring-diagram-reading", "appliance-repair", "energy-meter-installation", "cable-jointing",
  ],
  solar: [
    "site-survey", "module-mounting-structure", "pv-module-installation", "dc-cabling", "mc4-connector-crimping",
    "inverter-installation", "solar-earthing-and-lightning-protection", "work-at-height-safety", "panel-cleaning",
    "battery-bank-setup", "junction-box-wiring", "solar-plant-maintenance",
  ],
  retail: [
    "customer-greeting", "need-identification", "product-demonstration", "pos-billing", "cash-handling",
    "upi-and-card-payments", "visual-merchandising", "shelf-replenishment", "stock-counting", "personal-grooming",
    "complaint-handling", "returns-and-exchanges", "product-knowledge",
  ],
};

// [skill, share of postings asking for it, share of trainees holding it]
const MARKET: Record<Sector, [string, number, number][]> = {
  electrician: [
    ["house-wiring", 0.62, 0.82], ["fault-finding", 0.55, 0.51], ["earthing", 0.38, 0.7], ["control-panel-wiring", 0.4, 0.14],
    ["motor-starter-wiring", 0.31, 0.18], ["mcb-and-rccb-selection", 0.34, 0.66], ["electrical-safety", 0.42, 0.8],
    ["wiring-diagram-reading", 0.29, 0.48], ["preventive-maintenance", 0.27, 0.2], ["multimeter-use", 0.2, 0.84],
    ["conduit-installation", 0.22, 0.68], ["plc-basics", 0.14, 0.05],
  ],
  solar: [
    ["inverter-configuration", 0.82, 0.11], ["pv-module-installation", 0.74, 0.79], ["dc-cabling", 0.58, 0.55],
    ["system-commissioning", 0.46, 0.17], ["net-metering", 0.37, 0.12], ["mc4-connector-crimping", 0.41, 0.7],
    ["module-mounting-structure", 0.48, 0.73], ["solar-troubleshooting", 0.44, 0.24], ["string-design", 0.3, 0.1],
    ["work-at-height-safety", 0.33, 0.68], ["remote-monitoring-setup", 0.28, 0.08], ["site-survey", 0.26, 0.52],
  ],
  retail: [
    ["pos-billing", 0.66, 0.76], ["spoken-english", 0.48, 0.27], ["upselling", 0.43, 0.22], ["customer-greeting", 0.36, 0.86],
    ["upi-and-card-payments", 0.4, 0.78], ["stock-counting", 0.31, 0.6], ["inventory-software", 0.29, 0.13],
    ["visual-merchandising", 0.27, 0.55], ["cross-selling", 0.24, 0.18], ["complaint-handling", 0.22, 0.5],
    ["cash-handling", 0.35, 0.74],
  ],
};

const TITLES: Record<Sector, string[]> = {
  electrician: ["Electrician", "Maintenance Electrician", "Wireman", "Electrical Technician"],
  solar: ["Solar PV Installer", "Solar Rooftop Technician", "Solar Service Technician", "Solar Site Supervisor"],
  retail: ["Retail Sales Associate", "Store Cashier", "Sales Executive (Retail)", "Counter Sales Staff"],
};

const EMPLOYERS: Record<Sector, string[]> = {
  electrician: ["Deshmukh Electricals", "Sahyadri Engineering Works", "Patil Power Services", "Godavari Industries", "Shree Ganesh Switchgear"],
  solar: ["Suryoday Solar Solutions", "Konkan Renewables", "Vidarbha Sun Systems", "Aakash Rooftop Energy", "Marigold Green Power"],
  retail: ["Annapurna Super Bazaar", "Kulkarni Home Store", "Rajwada Garments", "Mahalaxmi Mart", "Sangam Mobile House"],
};

export function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAY = 86400000;
const LEARNER_COUNT = 570;
const POSTINGS_PER_SECTOR: Record<Sector, number> = { solar: 120, electrician: 95, retail: 85 };

export function buildSeedData(names: NameSource, now = new Date()) {
  const random = mulberry32(20261125);
  const pick = <T>(list: T[]) => list[Math.floor(random() * list.length)];
  const between = (min: number, max: number) => min + random() * (max - min);
  const daysAgo = (days: number) => {
    const date = new Date(now.getTime() - days * DAY);
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  };
  const shuffled = <T>(list: T[]) => {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  // Exact quotas keep the story stable whatever the random draw.
  const quota = (count: number, share: number) => {
    const yes = Math.round(count * share);
    return shuffled(Array.from({ length: count }, (_, i) => i < yes));
  };

  const phones = new Set<string>();
  const phone = () => {
    let value = "";
    do value = `${pick(["9", "8", "7"])}${String(Math.floor(random() * 1e9)).padStart(9, "0")}`;
    while (phones.has(value));
    phones.add(value);
    return value;
  };

  const programSkills = PROGRAMS.flatMap((program) =>
    CURRICULUM[program.sector].map((skillId) => ({ programId: program.id, skillId })),
  );

  const learners = PROGRAMS.flatMap((program, p) => {
    const count = LEARNER_COUNT / PROGRAMS.length;
    const holding = MARKET[program.sector].map(([skillId, , supply]) => ({ skillId, flags: quota(count, supply) }));
    const marketIds = new Set(holding.map((h) => h.skillId));
    const others = CURRICULUM[program.sector].filter((id) => !marketIds.has(id));
    const responded = quota(count, 0.8);

    return Array.from({ length: count }, (_, i) => {
      const enrolledAt = daysAgo(Math.floor(between(210, 540)));
      const completedAt = new Date(enrolledAt.getTime() + program.durationMonths * 30.44 * DAY);
      const priorSalary = random() < 0.6 ? 0 : Math.round(between(6000, 10000) / 500) * 500;
      const skills = [
        ...holding.filter((h) => h.flags[i]).map((h) => h.skillId),
        ...others.filter(() => random() < 0.6),
      ].map((skillId) => ({ skillId, verified: random() < 0.55 }));

      let outcome = null;
      if (responded[i]) {
        const placed = random() < [0.67, 0.74, 0.64][p];
        const status = !placed ? "NOT_EMPLOYED" : random() < 0.14 ? "SELF_EMPLOYED" : "EMPLOYED";
        const salary = placed ? between(...([[10500, 19000], [12500, 23000], [9500, 16000]][p] as [number, number])) : 0;
        const band = placed ? bandFor(salary) : null;
        const start = new Date(Math.min(completedAt.getTime() + between(0.2, 4) * 30.44 * DAY, now.getTime()));
        const verified = status === "EMPLOYED" && random() < 0.45;
        const submittedAt = daysAgo(Math.floor(between(1, 60)));
        outcome = {
          status: status as "EMPLOYED" | "NOT_EMPLOYED" | "SELF_EMPLOYED",
          employer: status === "EMPLOYED" ? pick(EMPLOYERS[program.sector]) : null,
          role: placed ? pick(TITLES[program.sector]) : null,
          salaryBand: band,
          salaryMonthly: band ? SALARY_BANDS[band] : null,
          startMonth: placed ? new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1)) : null,
          verified,
          verifiedAt: verified ? submittedAt : null,
          submittedAt,
        };
      }

      return {
        id: `learner-${program.sector}-${i + 1}`,
        name: `${names.firstName()} ${names.lastName()}`,
        phone: phone(),
        programId: program.id,
        district: DISTRICTS[(i + p) % DISTRICTS.length],
        batch: batchFor(enrolledAt),
        enrolledAt,
        priorSalary,
        skills,
        outcome,
      };
    });
  });

  const nameOf = new Map(SKILLS.map((s) => [s.id, s.name]));
  const postings = (Object.keys(POSTINGS_PER_SECTOR) as Sector[]).flatMap((sector) => {
    const count = POSTINGS_PER_SECTOR[sector];
    const asks = MARKET[sector].map(([skillId, demand]) => ({ skillId, flags: quota(count, demand) }));
    return Array.from({ length: count }, (_, i) => {
      const skillIds = asks.filter((a) => a.flags[i]).map((a) => a.skillId);
      if (!skillIds.length) skillIds.push(MARKET[sector][0][0]);
      const title = pick(TITLES[sector]);
      const district = DISTRICTS[i % DISTRICTS.length];
      // Weighted towards recent months so the trend has a direction.
      const postedAt = daysAgo(Math.floor(Math.pow(random(), sector === "solar" ? 1.5 : 1.05) * 175));
      const description = `${pick(EMPLOYERS[sector])} is hiring in ${district}. Must know: ${skillIds
        .map((id) => nameOf.get(id))
        .join("; ")}. Immediate joining preferred.`;
      return {
        id: `posting-${sector}-${i + 1}`,
        title,
        district,
        sector,
        description,
        postedAt,
        dedupeKey: `${postingKey(title, district, postedAt, description)}|${i}`,
        skillIds,
      };
    });
  });

  const comparison = DISTRICTS.flatMap((district, d) => {
    const count = 60;
    const employed = quota(count, [0.52, 0.49, 0.5, 0.46, 0.51, 0.45][d]);
    return Array.from({ length: count }, (_, i) => {
      const referenceDate = daysAgo(Math.floor(between(150, 450)));
      const priorSalary = random() < 0.6 ? 0 : Math.round(between(6000, 10000) / 500) * 500;
      const firstJob = new Date(Math.min(referenceDate.getTime() + between(0.8, 7) * 30.44 * DAY, now.getTime()));
      return {
        id: `comparison-${d + 1}-${i + 1}`,
        name: `${names.firstName()} ${names.lastName()}`,
        district,
        referenceDate,
        priorSalary,
        employed: employed[i],
        salary: employed[i] ? Math.round(between(8500, 15500) / 500) * 500 : null,
        firstJobDate: employed[i] ? firstJob : null,
      };
    });
  });

  const unmapped = [
    { term: "EV charger installation", count: 7 },
    { term: "Drone based panel inspection", count: 3 },
    { term: "WhatsApp order handling", count: 5 },
    { term: "Two wheeler driving licence", count: 11 },
    { term: "CCTV fitting", count: 4 },
  ];

  const pendingLinkLearnerIds = learners.filter((l) => !l.outcome).slice(0, 40).map((l) => l.id);

  return { programs: PROGRAMS, programSkills, learners, postings, comparison, unmapped, pendingLinkLearnerIds };
}
