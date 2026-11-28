import { motion } from "framer-motion";
import { useState } from "react";
import { api, errorText } from "../lib/api";
import { SECTOR } from "../lib/format";
import { rowMotion, useMotionOk } from "../lib/motion";
import { useUpload } from "../lib/upload";
import { useData } from "../lib/useData";
import DropZone from "./DropZone";
import { Button, Check, Empty, ErrorNote, Field, Select, Window } from "./ui";

const today = () => new Date().toISOString().slice(0, 10);

export default function PdfPanel() {
  const [kind, setKind] = useState("curriculum");
  const [draft, setDraft] = useState(null);
  const [form, setForm] = useState({});
  const [dropped, setDropped] = useState(new Set());
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const upload = useUpload("/upload/pdf");
  const options = useData("/filters");
  const health = useData("/health");
  const ok = useMotionOk();

  const reset = () => {
    setDraft(null);
    setResult(null);
    setSaveError("");
    upload.clearError();
  };

  async function read(file) {
    reset();
    const data = await upload.send(file, { kind });
    if (!data) return;
    setDraft(data);
    setDropped(new Set());
    setForm({ programName: data.title, title: data.title, district: data.district, postedAt: today(), sector: "", durationMonths: "3" });
  }

  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });
  const toggle = (key) => {
    const next = new Set(dropped);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setDropped(next);
  };

  const programs = options.data?.programs ?? [];
  const existing = programs.find((p) => p.name.toLowerCase() === form.programName?.trim().toLowerCase());
  const keptSkills = draft?.matched.filter((m) => !dropped.has(m.skillId)) ?? [];
  const keptTerms = draft?.unmapped.filter((t) => !dropped.has(`term:${t}`)) ?? [];

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setSaveError("");
    try {
      const { data } = await api.post("/upload/pdf/confirm", {
        ...form,
        kind: draft.kind,
        sector: form.sector || undefined,
        durationMonths: Number(form.durationMonths),
        description: draft.description,
        skillIds: keptSkills.map((m) => m.skillId),
        unmapped: keptTerms,
      });
      setResult(data);
      setDraft(null);
      options.reload();
    } catch (failure) {
      setSaveError(errorText(failure));
    } finally {
      setSaving(false);
    }
  }

  const sectorField = (label, blank) => (
    <Field label={label}>
      <Select value={form.sector} onChange={set("sector")} required={draft.kind === "curriculum"}>
        <option value="">{blank}</option>
        {Object.entries(SECTOR).map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </Select>
    </Field>
  );

  return (
    <Window title="PDF: curricula and job notices">
      <div className="mb-4 flex flex-wrap gap-3">
        {[
          ["curriculum", "Curriculum"],
          ["posting", "Job posting"],
        ].map(([key, label]) => (
          <Button
            key={key}
            small
            variant={kind === key ? "primary" : "plain"}
            aria-pressed={kind === key}
            disabled={upload.busy}
            onClick={() => {
              setKind(key);
              reset();
            }}
          >
            {label}
          </Button>
        ))}
      </div>
      <p className="mb-3 text-[12px] text-muted">
        Text PDFs under 4 MB. The model reads out the skills, you check them, then they are saved.
      </p>
      {health.data && !health.data.ai && (
        <p className="mb-3 border-2 border-yellow p-3 text-yellow">
          No Groq key on the server, so PDF reading is off. Add GROQ_API_KEY and restart. CSV upload works regardless.
        </p>
      )}
      <DropZone accept=".pdf" onFile={read} busy={upload.busy} progress={upload.progress} />
      <div className="mt-3">
        <ErrorNote>{upload.error}</ErrorNote>
      </div>

      {draft && (
        <form onSubmit={save} className="mt-4 space-y-4">
          {draft.kind === "curriculum" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Program name" className="sm:col-span-2">
                <input className="field" list="programs" required value={form.programName} onChange={set("programName")} />
                <datalist id="programs">
                  {programs.map((p) => (
                    <option key={p.id} value={p.name} />
                  ))}
                </datalist>
              </Field>
              {existing ? (
                <p className="m-0 text-muted sm:col-span-2">Adds to the existing {existing.name} curriculum.</p>
              ) : (
                <>
                  {sectorField("Sector (new program)", "Pick one")}
                  <Field label="Duration in months">
                    <input className="field" type="number" min="1" max="36" value={form.durationMonths} onChange={set("durationMonths")} />
                  </Field>
                </>
              )}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Job title" className="sm:col-span-2">
                <input className="field" required value={form.title} onChange={set("title")} />
              </Field>
              <Field label="District">
                <input className="field" required list="districts" value={form.district} onChange={set("district")} />
                <datalist id="districts">
                  {(options.data?.districts ?? []).map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
              </Field>
              <Field label="Posted on">
                <input className="field" type="date" required max={today()} value={form.postedAt} onChange={set("postedAt")} />
              </Field>
              {sectorField("Sector", "Work it out from the title")}
            </div>
          )}

          <fieldset className="border-2 border-line p-3">
            <legend className="px-1 text-[12px] text-muted">Matched skills ({keptSkills.length}). Untick to remove.</legend>
            {draft.matched.length ? (
              draft.matched.map((m, index) => (
                <motion.div key={m.skillId} className="py-1" {...rowMotion(index, ok)}>
                  <Check checked={!dropped.has(m.skillId)} onChange={() => toggle(m.skillId)}>
                    {m.name}
                    {m.term.toLowerCase() !== m.name.toLowerCase() && <span className="text-[12px] text-muted"> (written as "{m.term}")</span>}
                  </Check>
                </motion.div>
              ))
            ) : (
              <Empty>Nothing matched the skill list.</Empty>
            )}
          </fieldset>

          {draft.unmapped.length > 0 && (
            <fieldset className="border-2 border-line p-3">
              <legend className="px-1 text-[12px] text-muted">Not on the skill list ({keptTerms.length} go to the unmapped queue)</legend>
              {draft.unmapped.map((term) => (
                <div key={term} className="py-1">
                  <Check checked={!dropped.has(`term:${term}`)} onChange={() => toggle(`term:${term}`)}>
                    {term}
                  </Check>
                </div>
              ))}
            </fieldset>
          )}
          {draft.truncated && <p className="m-0 text-yellow">Long document. Only the first part was read.</p>}
          <ErrorNote>{saveError}</ErrorNote>
          <div className="flex gap-3">
            <Button variant="primary" type="submit" disabled={saving || (!keptSkills.length && !keptTerms.length)}>
              {saving ? "Saving..." : "Confirm and save"}
            </Button>
            <Button onClick={reset} disabled={saving}>
              Discard
            </Button>
          </div>
        </form>
      )}

      {result && (
        <div className="mt-4" role="status">
          <p className="font-pixel m-0 text-2xl text-neon">Saved: {result.name}</p>
          <p>
            {result.saved} skills added, {result.alreadyThere} already there, {result.queued} sent to the unmapped queue.
          </p>
          <Button onClick={reset}>Upload another</Button>
        </div>
      )}
    </Window>
  );
}
