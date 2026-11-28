import { motion } from "framer-motion";
import { useState } from "react";
import { DemandTrend } from "../components/Charts";
import CurriculumRecommendations from "../components/CurriculumRecommendations";
import FilterBar, { useFilterOptions } from "../components/FilterBar";
import PriorityList from "../components/PriorityList";
import UnmappedQueue from "../components/UnmappedQueue";
import { Button, Divider, Empty, ErrorNote, Loading, PageHead, Tag, Window } from "../components/ui";
import { api, errorText } from "../lib/api";
import { date } from "../lib/format";
import { rowMotion, useMotionOk } from "../lib/motion";
import { useData } from "../lib/useData";
import { useQueryParams } from "../lib/useQueryParams";

export default function SkillGaps() {
  const [params] = useQueryParams();
  const options = useFilterOptions();
  const gaps = useData("/gaps", params);
  const unmapped = useData("/unmapped");
  const [writing, setWriting] = useState(false);
  const [writeError, setWriteError] = useState("");
  const ok = useMotionOk();
  const data = gaps.data;

  async function writeRecommendations() {
    setWriting(true);
    setWriteError("");
    try {
      await api.post("/gaps/recommendations", null, { params });
      gaps.reload();
    } catch (failure) {
      setWriteError(errorText(failure));
    } finally {
      setWriting(false);
    }
  }

  return (
    <>
      <PageHead
        title="Skill Gaps &amp; Curriculum Intelligence"
        note="Evaluate market demand against trainee supply and curriculum coverage. Deterministic priority is demand x (1 - supply)."
      />

      <FilterBar
        options={options}
        categories={data?.categories || []}
        show={["sector", "category", "district", "program", "batch", "verified"]}
      />

      <ErrorNote onRetry={gaps.reload}>{gaps.error}</ErrorNote>
      {!data && gaps.loading && <Loading />}

      {data && (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted font-mono">
            <span>
              Analysis dataset: <strong className="text-neon">{data.postingTotal}</strong> job postings,{" "}
              <strong className="text-neon">{data.traineeTotal}</strong> trainees.
            </span>
            {params.category && (
              <span className="border border-cyan px-2 py-0.5 text-cyan">
                Category: {params.category}
              </span>
            )}
          </div>

          {/* Top Priority Gaps & Missing Skills */}
          <div className="grid gap-6 lg:grid-cols-12">
            <Window
              title="Top Priority Market Gaps"
              aside="High demand with low trainee supply"
              className="lg:col-span-7"
            >
              <PriorityList rows={data.priority} detailed />
            </Window>

            <div className="flex min-w-0 flex-col gap-6 lg:col-span-5">
              <Window title="Missing From Existing Curricula" aside="Urgent curriculum gaps">
                {data.missingFromCurricula.length ? (
                  <ul className="m-0 list-none p-0">
                    {data.missingFromCurricula.slice(0, 10).map((r) => (
                      <li key={r.skillId} className="flex justify-between items-center gap-3 border-b border-line py-2 last:border-b-0">
                        <div>
                          <span className="text-xs font-medium text-ink block">{r.name}</span>
                          <span className="text-[11px] font-mono text-muted">{r.sector}</span>
                        </div>
                        <span className="whitespace-nowrap font-mono text-xs px-2 py-0.5 border border-pink text-pink bg-pink/10">
                          {r.demandPct}% employer demand
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Empty>All mentioned skills are currently included in program syllabi.</Empty>
                )}
              </Window>

              <Window title="Most Demanded in Job Postings">
                {data.mostMentioned.some((r) => r.mentions) ? (
                  <ol className="m-0 list-none p-0">
                    {data.mostMentioned.filter((r) => r.mentions).slice(0, 8).map((r) => (
                      <li key={r.skillId} className="flex justify-between items-center gap-3 border-b border-line py-2 last:border-b-0">
                        <span className="text-xs text-ink">{r.name}</span>
                        <span className="whitespace-nowrap font-mono text-xs text-muted">
                          {r.mentions} postings ({r.demandPct}%)
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <Empty>No job postings recorded for this filter scope.</Empty>
                )}
              </Window>
            </div>
          </div>

          <Divider />

          {/* Smart Curriculum Recommendation Engine */}
          <CurriculumRecommendations params={params} onGenerated={gaps.reload} />

          <Divider />

          {/* Demand Trend & Unmapped Queue */}
          <div className="grid gap-6 lg:grid-cols-12">
            <Window title="Demand Trend (Last 6 Months)" className="lg:col-span-7">
              {data.trend.series.length ? (
                <DemandTrend trend={data.trend} />
              ) : (
                <Empty>No posting trend data found.</Empty>
              )}
            </Window>

            <Window
              title="Unmapped Skills Queue"
              aside="Terms awaiting taxonomy mapping"
              className="lg:col-span-5"
              bodyClass="max-h-96 overflow-y-auto p-4"
            >
              <ErrorNote onRetry={unmapped.reload}>{unmapped.error}</ErrorNote>
              {unmapped.data && (
                <UnmappedQueue
                  items={unmapped.data.items}
                  onChange={() => {
                    unmapped.reload();
                    gaps.reload();
                  }}
                />
              )}
            </Window>
          </div>

          <Divider />

          {/* Comprehensive Curriculum Coverage & Gap Matrix */}
          <Window
            title="Curriculum Coverage Matrix"
            aside={`${data.rows.length} total sector skills`}
            bodyClass="max-h-[32rem] overflow-auto p-2"
          >
            {data.rows.length ? (
              <table>
                <thead>
                  <tr>
                    <th>Skill Name</th>
                    <th>Category</th>
                    <th>Curriculum Status</th>
                    <th>Demand %</th>
                    <th>Trainee Supply</th>
                    <th>Verified Supply</th>
                    <th>Priority Score</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r, index) => {
                    const coverage = r.coverageStatus || (r.covered ? "covered" : "missing");
                    return (
                      <motion.tr key={r.skillId} {...rowMotion(index, ok)}>
                        <td className="font-medium text-ink">{r.name}</td>
                        <td className="font-mono text-xs text-muted">{r.category || r.sector}</td>
                        <td>
                          {coverage === "covered" ? (
                            <span className="font-mono text-[11px] px-2 py-0.5 border border-neon text-neon bg-neon/10">
                              [x] Covered
                            </span>
                          ) : coverage === "partial" ? (
                            <span className="font-mono text-[11px] px-2 py-0.5 border border-yellow text-yellow bg-yellow/10">
                              [~] Partial
                            </span>
                          ) : (
                            <span className="font-mono text-[11px] px-2 py-0.5 border border-pink text-pink bg-pink/10">
                              [ ] Missing
                            </span>
                          )}
                        </td>
                        <td className="font-mono">{r.demandPct}%</td>
                        <td className="font-mono">{r.supplyPct}%</td>
                        <td className="font-mono text-muted">{r.verifiedSupplyPct}%</td>
                        <td>
                          <span
                            className={`font-mono text-xs font-bold ${
                              r.priority >= 60
                                ? "text-pink"
                                : r.priority >= 30
                                ? "text-yellow"
                                : "text-ink"
                            }`}
                          >
                            {r.priority}
                          </span>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <Empty>No skills to evaluate. Upload a curriculum PDF or job postings.</Empty>
            )}
          </Window>
        </>
      )}
    </>
  );
}
