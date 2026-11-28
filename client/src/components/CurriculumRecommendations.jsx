import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { api, errorText } from "../lib/api";
import { date } from "../lib/format";
import { rowMotion, useMotionOk } from "../lib/motion";
import { useData } from "../lib/useData";
import { Button, Empty, ErrorNote, Loading, Select, Tag, Window } from "./ui";

const PRIORITY_TONE = {
  Critical: "pink",
  High: "yellow",
  Medium: "cyan",
  Low: "muted",
};

const COVERAGE_BADGE = {
  covered: { label: "Fully Covered", color: "border-neon text-neon bg-neon/10" },
  partial: { label: "Insufficient Coverage", color: "border-yellow text-yellow bg-yellow/10" },
  missing: { label: "Missing from Curriculum", color: "border-pink text-pink bg-pink/10" },
};

const STATUS_TABS = [
  { key: "all", label: "All Items" },
  { key: "PENDING", label: "Pending Review" },
  { key: "UNDER_REVIEW", label: "Under Review" },
  { key: "ACCEPTED", label: "Accepted" },
  { key: "REJECTED", label: "Rejected" },
];

export default function CurriculumRecommendations({ params, onGenerated }) {
  const { data, error, loading, reload } = useData("/curriculum-recs", params);
  const [activeTab, setActiveTab] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [actingId, setActingId] = useState("");
  const ok = useMotionOk();

  const recs = data?.recommendations ?? [];

  async function generate() {
    setGenerating(true);
    setGenError("");
    try {
      await api.post("/curriculum-recs", null, { params });
      reload();
      if (onGenerated) onGenerated();
    } catch (err) {
      setGenError(errorText(err));
    } finally {
      setGenerating(false);
    }
  }

  async function updateStatus(id, newStatus) {
    setActingId(id);
    try {
      await api.patch(`/curriculum-recs/${id}`, { status: newStatus });
      reload();
    } catch (err) {
      setGenError(errorText(err));
    } finally {
      setActingId("");
    }
  }

  const filtered = recs.filter((r) => {
    if (activeTab !== "all" && r.status !== activeTab) return false;
    if (priorityFilter !== "all" && r.category !== priorityFilter) return false;
    return true;
  });

  const acceptedCount = recs.filter((r) => r.status === "ACCEPTED").length;
  const underReviewCount = recs.filter((r) => r.status === "UNDER_REVIEW").length;
  const pendingCount = recs.filter((r) => r.status === "PENDING").length;

  return (
    <Window
      title="Smart Curriculum Recommendation Engine"
      aside={
        recs.length
          ? `${acceptedCount} accepted | ${underReviewCount} under review | ${pendingCount} pending`
          : "AI Curriculum Optimizer"
      }
      className="lg:col-span-12"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div>
          <p className="m-0 text-xs text-muted max-w-xl leading-relaxed">
            Deterministic evaluation of industry demand vs trainee supply and syllabus coverage,
            combined with AI-generated curriculum integration plans, learning outcomes and practical exercises.
          </p>
        </div>
        <Button
          variant="primary"
          loading={generating}
          disabled={generating}
          onClick={generate}
        >
          {generating ? "Synthesizing Recommendations..." : recs.length ? "Regenerate Analysis" : "Generate Recommendations"}
        </Button>
      </div>

      <ErrorNote onRetry={reload}>{error}</ErrorNote>
      <ErrorNote>{genError}</ErrorNote>

      {/* Tabs and Filters */}
      {recs.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 bg-bg/50 p-2 border border-line">
          <div className="flex flex-wrap gap-1">
            {STATUS_TABS.map((tab) => {
              const count =
                tab.key === "all"
                  ? recs.length
                  : recs.filter((r) => r.status === tab.key).length;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`cursor-pointer px-3 py-1 font-mono text-xs transition-colors border ${
                    activeTab === tab.key
                      ? "border-neon text-neon bg-neon/10 font-bold"
                      : "border-transparent text-muted hover:text-ink"
                  }`}
                >
                  {tab.label} ({count})
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="field !min-h-8 py-1 text-xs"
            >
              <option value="all">All Priorities</option>
              <option value="Critical">Critical Priority</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>
          </div>
        </div>
      )}

      {loading && !recs.length && <Loading children="Computing curriculum alignment..." />}

      {!loading && !recs.length && (
        <Empty>
          No curriculum recommendations generated for this filter. Press "Generate Recommendations" to run the engine.
        </Empty>
      )}

      {/* Recommendations Cards */}
      <div className="space-y-4">
        <AnimatePresence>
          {filtered.map((r, index) => {
            const coverageInfo = COVERAGE_BADGE[r.curriculumCoverage] || COVERAGE_BADGE.missing;
            return (
              <motion.article
                key={r.id}
                className={`border-2 border-line bg-surface p-4 transition-colors ${
                  r.status === "ACCEPTED"
                    ? "border-neon/60 bg-neon/5"
                    : r.status === "REJECTED"
                    ? "opacity-60 border-line"
                    : "hover:border-cyan"
                }`}
                {...rowMotion(index, ok)}
              >
                {/* Header Row */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="m-0 font-display text-base font-bold text-ink">
                        {r.skillName}
                      </h3>
                      <Tag tone={PRIORITY_TONE[r.category] || "neon"} tilt={0}>
                        {r.category} Priority ({r.priority})
                      </Tag>
                      <span className={`font-mono text-[11px] px-2 py-0.5 border ${coverageInfo.color}`}>
                        {coverageInfo.label}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-4 font-mono text-xs text-muted">
                      <span>
                        Industry Demand: <strong className="text-neon">{r.demandPct}%</strong>
                      </span>
                      <span>
                        Trainee Supply: <strong className="text-ink">{r.supplyPct}%</strong>
                      </span>
                      <span>
                        Placement: <strong className="text-cyan">{r.modulePosition}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Status & Review Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`font-mono text-xs px-2 py-1 border ${
                        r.status === "ACCEPTED"
                          ? "border-neon text-neon bg-neon/10 font-bold"
                          : r.status === "UNDER_REVIEW"
                          ? "border-yellow text-yellow bg-yellow/10"
                          : r.status === "REJECTED"
                          ? "border-pink text-pink bg-pink/10"
                          : "border-line text-muted"
                      }`}
                    >
                      {r.status.replace("_", " ")}
                    </span>

                    <div className="flex gap-1.5">
                      {r.status !== "ACCEPTED" && (
                        <Button
                          small
                          variant="primary"
                          disabled={actingId === r.id}
                          onClick={() => updateStatus(r.id, "ACCEPTED")}
                        >
                          Accept
                        </Button>
                      )}
                      {r.status !== "UNDER_REVIEW" && (
                        <Button
                          small
                          disabled={actingId === r.id}
                          onClick={() => updateStatus(r.id, "UNDER_REVIEW")}
                        >
                          Review
                        </Button>
                      )}
                      {r.status !== "REJECTED" && (
                        <Button
                          small
                          variant="danger"
                          disabled={actingId === r.id}
                          onClick={() => updateStatus(r.id, "REJECTED")}
                        >
                          Reject
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Body Details */}
                <div className="mt-3 grid gap-3 sm:grid-cols-3 text-xs leading-relaxed">
                  <div className="sm:col-span-1 border-r border-line/50 pr-3">
                    <span className="font-bold text-muted uppercase block text-[10px] tracking-wider mb-1">
                      Reason for Recommendation
                    </span>
                    <p className="m-0 text-ink/90">{r.reason}</p>
                  </div>

                  <div className="sm:col-span-1 border-r border-line/50 pr-3">
                    <span className="font-bold text-neon uppercase block text-[10px] tracking-wider mb-1">
                      Suggested Learning Outcome
                    </span>
                    <p className="m-0 text-ink/90">{r.learningOutcome}</p>
                  </div>

                  <div className="sm:col-span-1">
                    <span className="font-bold text-cyan uppercase block text-[10px] tracking-wider mb-1">
                      Recommended Practical Exercise
                    </span>
                    <p className="m-0 text-ink/90">{r.practicalExercise}</p>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </AnimatePresence>
      </div>
    </Window>
  );
}
