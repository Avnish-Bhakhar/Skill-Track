export interface MatchableSkill {
  id: string;
  name: string;
  aliases: string[];
}

export const normalize = (value: string) =>
  value.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();

export function buildMatcher<T extends MatchableSkill>(skills: T[]) {
  const exact = new Map<string, T>();
  for (const skill of skills) {
    for (const label of [skill.name, ...skill.aliases]) exact.set(normalize(label), skill);
  }
  const labels = [...exact.keys()].filter(Boolean).sort((a, b) => b.length - a.length);

  return {
    matchTerm(term: string): T | null {
      return exact.get(normalize(term)) ?? null;
    },
    findInText(text: string): T[] {
      let haystack = ` ${normalize(text)} `;
      const found = new Map<string, T>();
      for (const label of labels) {
        const needle = ` ${label} `;
        if (!haystack.includes(needle)) continue;
        const skill = exact.get(label)!;
        found.set(skill.id, skill);
        haystack = haystack.split(needle).join(" | ");
      }
      return [...found.values()];
    },
  };
}

export interface ExtractedTerm {
  term: string;
  suggested?: string | null;
}

export function mapExtracted<T extends MatchableSkill>(terms: ExtractedTerm[], skills: T[]) {
  const matcher = buildMatcher(skills);
  const matched = new Map<string, { skillId: string; name: string; term: string }>();
  const unmapped = new Map<string, string>();
  for (const { term, suggested } of terms) {
    const clean = term.trim().slice(0, 80);
    if (!normalize(clean)) continue;
    const skill = matcher.matchTerm(clean) ?? (suggested ? matcher.matchTerm(suggested) : null);
    if (skill) matched.set(skill.id, { skillId: skill.id, name: skill.name, term: clean });
    else unmapped.set(normalize(clean), clean);
  }
  return { matched: [...matched.values()], unmapped: [...unmapped.values()] };
}
