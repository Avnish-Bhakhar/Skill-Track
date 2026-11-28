import { motion } from "framer-motion";
import { Fragment, useState } from "react";
import FilterBar, { useFilterOptions } from "../components/FilterBar";
import { Button, Check, Drawer, Empty, ErrorNote, Loading, PageHead, Skeleton, Tag, Window } from "../components/ui";
import { api, downloadFile, errorText } from "../lib/api";
import { date, rupees, STATUS } from "../lib/format";
import { rowMotion, useMotionOk } from "../lib/motion";
import { useData } from "../lib/useData";
import { useQueryParams } from "../lib/useQueryParams";

const linkFor = (token) => `${window.location.origin}/check-in/${token}`;

export default function Learners() {
  const [params, setParams] = useQueryParams();
  const options = useFilterOptions();
  const { data, error, loading, reload } = useData("/learners", params);
  const [ticked, setTicked] = useState(new Set());
  const [selectedLearnerId, setSelectedLearnerId] = useState(null);
  const [learnerDetail, setLearnerDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const ok = useMotionOk();

  const learners = data?.learners ?? [];
  const page = data?.page ?? 1;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const allTicked = learners.length > 0 && learners.every((l) => ticked.has(l.id));

  const toggle = (ids, on) => {
    const next = new Set(ticked);
    for (const id of ids) {
      if (on) next.add(id);
      else next.delete(id);
    }
    setTicked(next);
  };

  async function run(task) {
    setBusy(true);
    setActionError("");
    setNotice("");
    try {
      await task();
    } catch (failure) {
      setActionError(errorText(failure));
    } finally {
      setBusy(false);
    }
  }

  async function copy(url) {
    try {
      await navigator.clipboard.writeText(url);
      setNotice("Check-in link copied to clipboard.");
    } catch {
      window.prompt("Copy this link:", url);
    }
  }

  const makeLinks = (ids) =>
    run(async () => {
      const response = await api.post("/learners/links", { learnerIds: ids });
      const links = response.data.links;
      reload();
      if (ids.length === 1 && links[0]) {
        await copy(links[0].url);
      } else {
        setTicked(new Set());
        setNotice(
          `${links.length} active links generated (valid for 14 days). Older unused links have been invalidated.`
        );
      }
    });

  const downloadAll = () =>
    run(async () => {
      await downloadFile("/learners/links/csv", params, "checkin-links.csv");
      reload();
    });

  const verifyOutcome = (outcome) =>
    run(async () => {
      await api.patch(`/outcomes/${outcome.id}/verify`, { verified: !outcome.verified });
      reload();
      if (selectedLearnerId) openProfile(selectedLearnerId);
    });

  const verifySkill = (learnerId, skill) =>
    run(async () => {
      await api.patch(`/learners/${learnerId}/skills`, { skillId: skill.id, verified: !skill.verified });
      reload();
      if (selectedLearnerId) openProfile(selectedLearnerId);
    });

  async function openProfile(id) {
    setSelectedLearnerId(id);
    setDetailLoading(true);
    try {
      const res = await api.get(`/learners/${id}`);
      setLearnerDetail(res.data.learner);
    } catch (err) {
      setActionError(errorText(err));
    } finally {
      setDetailLoading(false);
    }
  }

  function closeProfile() {
    setSelectedLearnerId(null);
    setLearnerDetail(null);
  }

  return (
    <>
      <PageHead
        title="Learners"
        note="Registry of enrolled trainees, verified skills, single-use check-in links and reported employment outcomes."
      >
        <Button onClick={() => makeLinks([...ticked])} disabled={!ticked.size || busy} variant="primary">
          Generate links for selected ({ticked.size})
        </Button>
        <Button onClick={downloadAll} disabled={busy || !data?.total}>
          Download all links as CSV
        </Button>
      </PageHead>

      <FilterBar
        options={options}
        show={["search", "district", "program", "batch", "status"]}
      />

      <ErrorNote onRetry={reload}>{error}</ErrorNote>
      <ErrorNote>{actionError}</ErrorNote>

      {notice && (
        <div role="status" className="mb-4 flex items-center justify-between border-2 border-neon bg-neon/10 p-3 text-xs text-neon">
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice("")}
            className="cursor-pointer border-0 bg-transparent font-bold text-neon"
          >
            [dismiss]
          </button>
        </div>
      )}

      {!data && loading && <Loading />}

      {data && (
        <Window
          title="Trainee Register"
          aside={`${data.total.toLocaleString("en-IN")} matching trainees`}
          bodyClass="overflow-x-auto p-2"
        >
          {learners.length ? (
            <table>
              <thead>
                <tr>
                  <th className="w-10">
                    <Check
                      checked={allTicked}
                      onChange={(on) => toggle(learners.map((l) => l.id), on)}
                      label="Select all"
                    />
                  </th>
                  <th>Trainee Details</th>
                  <th>Program &amp; Batch</th>
                  <th>District</th>
                  <th>Skills</th>
                  <th>Employment Outcome</th>
                  <th>Check-In Action</th>
                </tr>
              </thead>
              <tbody>
                {learners.map((l, index) => (
                  <motion.tr key={l.id} {...rowMotion(index, ok)} className="hover:bg-neon/5">
                    <td>
                      <Check checked={ticked.has(l.id)} onChange={(on) => toggle([l.id], on)} label={`Select ${l.name}`} />
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => openProfile(l.id)}
                        className="cursor-pointer border-0 bg-transparent p-0 text-left hover:underline"
                      >
                        <div className="font-bold text-ink">{l.name}</div>
                        <div className="font-mono text-[11px] text-muted">{l.phone}</div>
                      </button>
                    </td>
                    <td>
                      <div className="text-xs text-ink">{l.program}</div>
                      <div className="font-mono text-[11px] text-muted">Batch: {l.batch}</div>
                    </td>
                    <td className="text-xs">{l.district}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => openProfile(l.id)}
                        className="cursor-pointer border border-line bg-surface px-2 py-0.5 font-mono text-[11px] text-ink hover:border-cyan"
                      >
                        {l.skills.length} skills ({l.skills.filter((s) => s.verified).length} ver.)
                      </button>
                    </td>
                    <td>
                      {l.outcome ? (
                        <div>
                          <span
                            className={`font-mono text-[11px] px-1.5 py-0.5 border ${
                              l.outcome.status === "EMPLOYED"
                                ? "border-neon text-neon bg-neon/10"
                                : l.outcome.status === "SELF_EMPLOYED"
                                ? "border-cyan text-cyan bg-cyan/10"
                                : "border-pink text-pink bg-pink/10"
                            }`}
                          >
                            {STATUS[l.outcome.status]}
                          </span>
                          {l.outcome.employer && (
                            <div className="mt-1 text-[11px] text-muted truncate max-w-44">
                              {l.outcome.employer}
                            </div>
                          )}
                          {l.outcome.status === "EMPLOYED" && (
                            <div className="mt-1">
                              <Check checked={l.outcome.verified} onChange={() => verifyOutcome(l.outcome)}>
                                <span className="text-[11px] text-muted">employer verified</span>
                              </Check>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="font-mono text-[11px] text-muted">No response yet</span>
                      )}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        {l.token && (
                          <Button small onClick={() => copy(linkFor(l.token))}>
                            Copy link
                          </Button>
                        )}
                        <Button small disabled={busy} onClick={() => makeLinks([l.id])}>
                          {l.token ? "New link" : "Make link"}
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty>{Object.keys(params).length ? "No trainees match the current filters." : undefined}</Empty>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between gap-3 border-t border-line p-3">
            <Button small disabled={page <= 1} onClick={() => setParams({ page: String(page - 1) })}>
              &lt; Previous
            </Button>
            <span className="font-mono text-xs text-muted">
              Page {page} of {pages} ({data.total.toLocaleString("en-IN")} total)
            </span>
            <Button small disabled={page >= pages} onClick={() => setParams({ page: String(page + 1) })}>
              Next &gt;
            </Button>
          </div>
        </Window>
      )}

      {/* Individual Learner Profile Drawer with Timeline */}
      <Drawer
        open={Boolean(selectedLearnerId)}
        onClose={closeProfile}
        title={learnerDetail?.name || "Trainee Profile"}
        subtitle={learnerDetail ? `${learnerDetail.program?.name} | ${learnerDetail.district}` : "Loading details..."}
      >
        {detailLoading && (
          <div className="space-y-4">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {learnerDetail && (
          <div className="space-y-6">
            {/* Meta Card */}
            <div className="border-2 border-line bg-bg p-4 text-xs space-y-2">
              <div className="grid grid-cols-2 gap-3 font-mono">
                <div>
                  <span className="text-muted block">Phone:</span>
                  <span className="text-ink font-bold">{learnerDetail.phone}</span>
                </div>
                <div>
                  <span className="text-muted block">Batch:</span>
                  <span className="text-ink">{learnerDetail.batch}</span>
                </div>
                <div>
                  <span className="text-muted block">District:</span>
                  <span className="text-ink">{learnerDetail.district}</span>
                </div>
                <div>
                  <span className="text-muted block">Enrolled Date:</span>
                  <span className="text-ink">{date(learnerDetail.enrolledAt)}</span>
                </div>
                <div>
                  <span className="text-muted block">Prior Monthly Salary:</span>
                  <span className="text-ink">{rupees(learnerDetail.priorSalary)}</span>
                </div>
                <div>
                  <span className="text-muted block">Course Duration:</span>
                  <span className="text-ink">{learnerDetail.program?.durationMonths} months</span>
                </div>
              </div>
            </div>

            {/* Current Employment Status */}
            <div>
              <h3 className="font-display m-0 text-sm font-bold text-ink mb-2">
                Employment Outcome
              </h3>
              {learnerDetail.outcome ? (
                <div className="border-2 border-line bg-surface p-4 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-neon">
                      {STATUS[learnerDetail.outcome.status]}
                    </span>
                    {learnerDetail.outcome.status === "EMPLOYED" && (
                      <Check
                        checked={learnerDetail.outcome.verified}
                        onChange={() => verifyOutcome(learnerDetail.outcome)}
                      >
                        <span className="text-xs">Employer Verified</span>
                      </Check>
                    )}
                  </div>
                  {learnerDetail.outcome.employer && (
                    <p className="m-0 text-ink">
                      <span className="text-muted">Employer:</span> {learnerDetail.outcome.employer}
                    </p>
                  )}
                  {learnerDetail.outcome.role && (
                    <p className="m-0 text-ink">
                      <span className="text-muted">Role:</span> {learnerDetail.outcome.role}
                    </p>
                  )}
                  {learnerDetail.outcome.salaryBand && (
                    <p className="m-0 text-ink">
                      <span className="text-muted">Reported Salary Band:</span> {learnerDetail.outcome.salaryBand}
                    </p>
                  )}
                  {learnerDetail.outcome.salaryMonthly && (
                    <p className="m-0 font-mono text-neon font-bold">
                      Calculated Monthly Pay: {rupees(learnerDetail.outcome.salaryMonthly)}
                    </p>
                  )}
                  <p className="m-0 text-[11px] text-muted">
                    Reported on: {date(learnerDetail.outcome.submittedAt)}
                  </p>
                </div>
              ) : (
                <div className="border border-line p-3 text-xs text-muted">
                  No post-training survey received yet.
                </div>
              )}
            </div>

            {/* Skills Inventory */}
            <div>
              <h3 className="font-display m-0 text-sm font-bold text-ink mb-2">
                Acquired Skills ({learnerDetail.skills?.length || 0})
              </h3>
              <p className="text-xs text-muted mb-2">
                Check a skill once verified by an officer or assessor.
              </p>
              <div className="border-2 border-line bg-surface p-3 max-h-48 overflow-y-auto space-y-1.5">
                {learnerDetail.skills?.length ? (
                  learnerDetail.skills.map((s) => (
                    <div key={s.skillId} className="flex items-center justify-between border-b border-line/40 py-1 last:border-b-0">
                      <Check
                        checked={s.verified}
                        onChange={() => verifySkill(learnerDetail.id, { id: s.skillId, verified: s.verified })}
                      >
                        <span className="text-xs font-medium">{s.skill?.name || s.skillId}</span>
                      </Check>
                      <span className="font-mono text-[10px] text-muted">
                        {s.verified ? "verified" : "self-reported"}
                      </span>
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-muted">No skills recorded.</span>
                )}
              </div>
            </div>

            {/* Timeline History */}
            <div>
              <h3 className="font-display m-0 text-sm font-bold text-ink mb-3">
                Tracking &amp; Check-In Timeline
              </h3>
              <div className="relative border-l-2 border-line pl-4 space-y-4 text-xs font-mono">
                {/* Milestone 1: Outcome if present */}
                {learnerDetail.outcome && (
                  <div className="relative">
                    <span className="absolute -left-[21px] top-1 size-2.5 bg-neon" />
                    <div className="font-bold text-neon">Outcome Submitted</div>
                    <div className="text-[11px] text-muted">{date(learnerDetail.outcome.submittedAt)}</div>
                    <div className="text-ink mt-0.5">
                      Status: {STATUS[learnerDetail.outcome.status]}
                      {learnerDetail.outcome.employer && ` at ${learnerDetail.outcome.employer}`}
                    </div>
                  </div>
                )}

                {/* Milestone 2: Check-in links */}
                {learnerDetail.links && learnerDetail.links.length > 0 ? (
                  learnerDetail.links.map((link) => (
                    <div key={link.token} className="relative">
                      <span
                        className={`absolute -left-[21px] top-1 size-2.5 ${
                          link.usedAt ? "bg-cyan" : "bg-yellow"
                        }`}
                      />
                      <div className="font-bold text-ink">
                        {link.usedAt ? "Check-in Link Answered" : "Check-in Link Generated"}
                      </div>
                      <div className="text-[11px] text-muted">
                        Created: {date(link.createdAt)} | Expires: {date(link.expiresAt)}
                      </div>
                      <div className="mt-1 flex gap-2">
                        {!link.usedAt && new Date(link.expiresAt) > new Date() && (
                          <Button small onClick={() => copy(linkFor(link.token))}>
                            Copy active link
                          </Button>
                        )}
                        {link.usedAt && (
                          <span className="text-[11px] text-cyan">Completed on {date(link.usedAt)}</span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="relative">
                    <span className="absolute -left-[21px] top-1 size-2.5 bg-line" />
                    <div className="text-muted">No check-in links generated yet.</div>
                  </div>
                )}

                {/* Milestone 3: Enrollment */}
                <div className="relative">
                  <span className="absolute -left-[21px] top-1 size-2.5 bg-line" />
                  <div className="font-bold text-ink">Enrolled in {learnerDetail.program?.name}</div>
                  <div className="text-[11px] text-muted">{date(learnerDetail.enrolledAt)}</div>
                  <div className="text-muted mt-0.5">District: {learnerDetail.district}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </>
  );
}
