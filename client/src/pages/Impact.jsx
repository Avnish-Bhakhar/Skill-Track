import { GroupedBars } from "../components/Charts";
import FilterBar, { useFilterOptions } from "../components/FilterBar";
import { Divider, Empty, ErrorNote, Loading, PageHead, Tag, Window } from "../components/ui";
import { number, rupees, signed } from "../lib/format";
import { colors } from "../lib/theme";
import { useData } from "../lib/useData";
import { useQueryParams } from "../lib/useQueryParams";

const SERIES = [
  { key: "participants", name: "Trainees (Treatment)", color: colors.neon },
  { key: "comparison", name: "Comparison Group (Benchmark)", color: colors.muted },
];

function calculateCi(p1, n1, p2, n2) {
  if (!p1 || !p2 || !n1 || !n2 || n1 < 10 || n2 < 10) return null;
  const prop1 = p1 / 100;
  const prop2 = p2 / 100;
  const se = Math.sqrt((prop1 * (1 - prop1)) / n1 + (prop2 * (1 - prop2)) / n2);
  const diff = p1 - p2;
  const margin = 1.96 * se * 100;
  const lower = Math.round((diff - margin) * 10) / 10;
  const upper = Math.round((diff + margin) * 10) / 10;
  return { lower, upper, margin: Math.round(margin * 10) / 10 };
}

function MeasureCard({ title, measure, unit, format, difference, sentence, ci }) {
  const missing = measure.participants === null || measure.comparison === null;
  return (
    <Window title={title}>
      {missing ? (
        <Empty>Insufficient data on both cohorts to compute comparison.</Empty>
      ) : (
        <>
          <div className="flex items-baseline justify-between">
            <div className="font-display mb-2 text-3xl sm:text-4xl font-bold text-neon">{difference}</div>
            {ci && (
              <span className="font-mono text-[11px] text-muted border border-line px-2 py-0.5">
                95% CI: [{ci.lower > 0 ? `+${ci.lower}` : ci.lower} to {ci.upper > 0 ? `+${ci.upper}` : ci.upper}{unit}]
              </span>
            )}
          </div>
          <GroupedBars
            data={[{ measure: title, participants: measure.participants, comparison: measure.comparison }]}
            category="measure"
            unit={unit}
            height={200}
            series={SERIES}
            label={title}
          />
          <p className="mt-3 mb-0 text-xs text-ink/90 leading-relaxed">{sentence}</p>
          <div className="mt-2 flex justify-between font-mono text-[11px] text-muted border-t border-line/60 pt-2">
            <span>Trainees: <strong className="text-neon">{format(measure.participants)}</strong></span>
            <span>Benchmark: <strong className="text-ink">{format(measure.comparison)}</strong></span>
          </div>
        </>
      )}
    </Window>
  );
}

const monthsSentence = (d) =>
  d === null
    ? ""
    : Math.abs(d) < 0.1
    ? "Both groups transitioned into work in virtually identical timeframes."
    : `Placed trainees entered employment ${Math.abs(d)} months ${d < 0 ? "faster" : "slower"} than comparison peers.`;

const salarySentence = (d) =>
  d === null
    ? ""
    : `Monthly remuneration trajectory shifted ${rupees(Math.abs(d))} ${
        d >= 0 ? "higher" : "lower"
      } for trainees relative to comparison earners.`;

export default function Impact() {
  const [params] = useQueryParams();
  const options = useFilterOptions();
  const { data, error, loading, reload } = useData("/impact", params);

  const placementCi =
    data && data.placement.participants !== null && data.placement.comparison !== null
      ? calculateCi(
          data.placement.participants,
          data.participantCount,
          data.placement.comparison,
          data.comparisonCount
        )
      : null;

  return (
    <>
      <PageHead
        title="Impact &amp; Causal Evaluation"
        note="Comparison between completed course trainees and non-participant peers across matching districts."
        tag="Comparative Analytics"
        tone="yellow"
      />

      <FilterBar options={options} show={["district", "program", "batch", "from", "to"]} />

      <ErrorNote onRetry={reload}>{error}</ErrorNote>
      {!data && loading && <Loading />}

      {data && (
        <>
          {/* Cohort Size Breakdown */}
          <div className="grid gap-4 sm:grid-cols-4 mb-6 text-xs font-mono">
            <div className="border-2 border-line bg-surface p-3">
              <span className="text-muted block">Enrolled Trainees:</span>
              <span className="font-display text-2xl font-bold text-ink">{data.totalParticipants}</span>
            </div>
            <div className="border-2 border-line bg-surface p-3">
              <span className="text-muted block">Treatment Group (Responded):</span>
              <span className="font-display text-2xl font-bold text-neon">{data.participantCount}</span>
            </div>
            <div className="border-2 border-line bg-surface p-3">
              <span className="text-muted block">Comparison Group (Benchmark):</span>
              <span className="font-display text-2xl font-bold text-cyan">{data.comparisonCount}</span>
            </div>
            <div className="border-2 border-line bg-surface p-3">
              <span className="text-muted block">Excluded (No District Match):</span>
              <span className="font-display text-2xl font-bold text-muted">{data.unmatchedCount}</span>
            </div>
          </div>

          {/* Primary Statistical Measures */}
          <div className="grid gap-6 lg:grid-cols-3">
            <MeasureCard
              title="Placement Rate"
              measure={data.placement}
              unit="%"
              format={(v) => `${v}%`}
              difference={signed(data.placement.difference, " pts")}
              sentence={data.sentence}
              ci={placementCi}
            />
            <MeasureCard
              title="Months to First Job"
              measure={data.monthsToFirstJob}
              unit=" mo"
              format={(v) => `${number(v)} mo`}
              difference={signed(data.monthsToFirstJob.difference, " mo")}
              sentence={monthsSentence(data.monthsToFirstJob.difference)}
            />
            <MeasureCard
              title="Monthly Salary Delta"
              measure={data.salaryChange}
              unit=""
              format={rupees}
              difference={
                data.salaryChange.difference === null
                  ? "n/a"
                  : `${data.salaryChange.difference > 0 ? "+" : ""}${rupees(data.salaryChange.difference)}`
              }
              sentence={salarySentence(data.salaryChange.difference)}
            />
          </div>

          <Divider />

          {/* District Breakdown Chart */}
          <Window
            title="Placement Rate by District (Treated vs Benchmark)"
            aside="Re-weighted to trainee geographic distribution"
          >
            {data.byDistrict.length ? (
              <GroupedBars
                data={data.byDistrict}
                category="district"
                unit="%"
                domain={[0, 100]}
                series={SERIES}
                height={300}
                label="Placement rate by district"
              />
            ) : (
              <Empty>No districts contain concurrent treated and comparison cohorts in this slice.</Empty>
            )}
          </Window>

          {/* Statistical Methodology & Causal Distinction */}
          <div className="mt-8 border-2 border-line bg-surface p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Tag tone="yellow" tilt={0}>
                Methodology &amp; Interpretative Guidelines
              </Tag>
              <span className="font-mono text-xs text-muted">
                Observational study design
              </span>
            </div>

            <div className="grid gap-6 md:grid-cols-2 text-xs leading-relaxed text-muted">
              <div>
                <h4 className="font-display text-sm font-bold text-ink mb-1">
                  Weighting &amp; Matching Protocol
                </h4>
                <p className="m-0">
                  Data reflects <strong className="text-ink">{data.participantCount} verified responders</strong> matched against{" "}
                  <strong className="text-ink">{data.comparisonCount} comparison records</strong>. Comparison statistics are mathematically
                  re-weighted according to the exact district mix of the enrolled trainee cohort. Date, program, and batch filters apply
                  to trainees; geographic district matching applies to comparison records.
                </p>
              </div>

              <div>
                <h4 className="font-display text-sm font-bold text-ink mb-1">
                  Correlation vs. Causal Attribution
                </h4>
                <p className="m-0">
                  Trainees voluntarily opted into vocational programs and were not randomly assigned via a Randomized Controlled Trial (RCT).
                  Observed differences reflect a combination of curriculum value-add, baseline motivation, and local employer networks.
                  Figures are presented as evaluative indicators rather than definitive laboratory proof.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
