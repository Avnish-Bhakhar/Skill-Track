import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { saveBlob } from "../lib/api";
import { rowMotion, useMotionOk } from "../lib/motion";
import { useUpload } from "../lib/upload";
import DropZone from "./DropZone";
import { Button, ErrorNote, Field, Select, Tag, Window } from "./ui";

const KINDS = {
  learners: {
    label: "Learners",
    requiredFields: ["name", "phone", "program", "district", "skills", "enrolledAt"],
    optionalFields: ["batch", "priorSalary", "verifiedSkills"],
    fieldSynonyms: {
      name: ["name", "full name", "fullname", "trainee name", "student name", "candidate"],
      phone: ["phone", "mobile", "contact", "phone number", "mobile number"],
      program: ["program", "course", "trade", "training program", "stream"],
      district: ["district", "city", "location", "centre"],
      skills: ["skills", "skill", "competencies", "key skills"],
      enrolledAt: ["enrolledat", "enrollment date", "enrolled date", "date of enrollment", "start date", "enrolled"],
      batch: ["batch", "cohort", "batch code"],
      priorSalary: ["priorsalary", "previous salary", "prior income", "past salary"],
    },
    template:
      'name,phone,program,district,skills,enrolledAt\nPriya Shinde,9822011223,Solar PV Installer,Pune,"DC cabling; Site survey",2026-06-01\n',
  },
  postings: {
    label: "Job postings",
    requiredFields: ["title", "district", "description", "postedAt"],
    optionalFields: [],
    fieldSynonyms: {
      title: ["title", "job title", "role", "designation", "position"],
      district: ["district", "city", "location", "work location"],
      description: ["description", "job description", "requirements", "details"],
      postedAt: ["postedat", "posted on", "date posted", "posting date", "date"],
    },
    template:
      'title,district,description,postedAt\nSolar Rooftop Technician,Nashik,"Must know inverter configuration and MC4 crimping",2026-10-12\n',
  },
};

function autoDetectMapping(headers, synonyms) {
  const mapping = {};
  const lowerHeaders = headers.map((h) => h.trim().toLowerCase());

  for (const [canonicalField, aliasList] of Object.entries(synonyms)) {
    const matchedIndex = lowerHeaders.findIndex((h) => aliasList.includes(h) || h === canonicalField.toLowerCase());
    if (matchedIndex !== -1) {
      mapping[canonicalField] = headers[matchedIndex];
    } else {
      mapping[canonicalField] = "";
    }
  }
  return mapping;
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function CsvPanel() {
  const [kind, setKind] = useState("learners");
  const [file, setFile] = useState(null);
  const [rawHeaders, setRawHeaders] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});
  const [showMapping, setShowMapping] = useState(false);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [committing, setCommitting] = useState(false);
  const upload = useUpload("/upload/csv");
  const ok = useMotionOk();
  const config = KINDS[kind];

  const reset = () => {
    setFile(null);
    setRawHeaders([]);
    setColumnMapping({});
    setShowMapping(false);
    setPreview(null);
    setResult(null);
    setShowConfirm(false);
    setCommitting(false);
    upload.clearError();
  };

  async function checkFile(chosen) {
    reset();
    setFile(chosen);

    // Read first chunk to extract headers
    try {
      const text = await chosen.slice(0, 8192).text();
      const firstLine = text.split(/\r\n|\n|\r/)[0] || "";
      const parsedHeaders = firstLine
        .split(",")
        .map((h) => h.replace(/^["'\s]+|["'\s]+$/g, ""))
        .filter(Boolean);

      setRawHeaders(parsedHeaders);
      const initialMapping = autoDetectMapping(parsedHeaders, config.fieldSynonyms);
      setColumnMapping(initialMapping);

      // Check if all required fields are directly matched
      const hasMissingRequired = config.requiredFields.some((f) => !initialMapping[f]);
      if (hasMissingRequired) {
        setShowMapping(true);
      } else {
        // Proceed with initial preview
        await runPreview(chosen);
      }
    } catch {
      await runPreview(chosen);
    }
  }

  async function runPreview(fileToTest) {
    const data = await upload.send(fileToTest, { kind, mode: "preview" });
    if (data) {
      setPreview(data);
    }
  }

  // If user changed column mappings, apply mapping to CSV and preview
  async function applyMappingAndPreview() {
    if (!file) return;
    try {
      const fullText = await file.text();
      const lines = fullText.split(/\r\n|\n|\r/);
      if (!lines.length) return;

      const oldHeaderLine = lines[0];
      const oldCols = oldHeaderLine.split(",").map((h) => h.replace(/^["'\s]+|["'\s]+$/g, ""));

      // Invert mapping: oldCol -> canonicalField
      const inverted = {};
      for (const [canonical, oldName] of Object.entries(columnMapping)) {
        if (oldName) inverted[oldName] = canonical;
      }

      const newCols = oldCols.map((c) => inverted[c] || c);
      lines[0] = newCols.join(",");
      const transformedText = lines.join("\n");
      const transformedFile = new File([transformedText], file.name, { type: "text/csv" });

      setFile(transformedFile);
      setShowMapping(false);
      await runPreview(transformedFile);
    } catch {
      await runPreview(file);
    }
  }

  async function executeCommit() {
    setCommitting(true);
    setShowConfirm(false);
    const data = await upload.send(file, { kind, mode: "commit" });
    setCommitting(false);
    if (data) {
      setPreview(null);
      setResult(data);
    }
  }

  const missingRequired = config.requiredFields.filter((f) => !columnMapping[f]);

  return (
    <Window title="CSV Import: Trainees & Market Postings">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {Object.entries(KINDS).map(([key, value]) => (
            <Button
              key={key}
              small
              variant={kind === key ? "primary" : "plain"}
              aria-pressed={kind === key}
              disabled={upload.busy || committing}
              onClick={() => {
                setKind(key);
                reset();
              }}
            >
              {value.label}
            </Button>
          ))}
        </div>
        <Button
          small
          onClick={() =>
            saveBlob(new Blob([config.template], { type: "text/csv" }), `${kind}-template.csv`)
          }
        >
          Download template
        </Button>
      </div>

      <p className="mb-3 text-xs text-muted leading-relaxed">
        Required columns: <span className="font-mono text-ink">{config.requiredFields.join(", ")}</span>.{" "}
        Automatic column detection matches standard headers.
      </p>

      {!preview && !result && (
        <DropZone accept=".csv" onFile={checkFile} busy={upload.busy} progress={upload.progress} />
      )}

      <div className="mt-3">
        <ErrorNote>{upload.error}</ErrorNote>
      </div>

      {/* Column Mapping Section */}
      {showMapping && rawHeaders.length > 0 && (
        <div className="mt-4 border-2 border-line bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="m-0 font-display text-sm font-bold text-ink">CSV Column Mapping</h3>
              <p className="m-0 text-xs text-muted">
                Match the columns in <span className="text-neon">{file?.name}</span> with database fields.
              </p>
            </div>
            {missingRequired.length > 0 && (
              <Tag tone="pink" tilt={0}>
                {missingRequired.length} unmapped
              </Tag>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {config.requiredFields.map((field) => (
              <Field
                key={field}
                label={`${field} (required)`}
                error={!columnMapping[field] ? "Required" : ""}
              >
                <Select
                  value={columnMapping[field] || ""}
                  onChange={(e) => setColumnMapping({ ...columnMapping, [field]: e.target.value })}
                >
                  <option value="">-- Select column --</option>
                  {rawHeaders.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </Select>
              </Field>
            ))}
          </div>

          <div className="mt-4 flex gap-3">
            <Button
              variant="primary"
              small
              disabled={missingRequired.length > 0}
              onClick={applyMappingAndPreview}
            >
              Apply Mapping & Preview
            </Button>
            <Button small onClick={() => setShowMapping(false)}>
              Keep Original
            </Button>
          </div>
        </div>
      )}

      {/* File Preview and Inspection */}
      {preview && file && !result && (
        <div className="mt-4 space-y-4">
          {/* File Meta Summary */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-2 border-line bg-bg p-3 text-xs">
            <div>
              <span className="font-bold text-ink">{file.name}</span>
              <span className="text-muted ml-2">({formatBytes(file.size)})</span>
            </div>
            <div className="flex items-center gap-3 font-mono">
              <span className="text-muted">Total: {preview.total} rows</span>
              <span className="text-neon font-bold">Ready: {preview.ready}</span>
              {preview.skippedRows.length > 0 && (
                <span className="text-pink">Skipped: {preview.skippedRows.length}</span>
              )}
            </div>
          </div>

          {/* Table Preview */}
          <div className="max-h-64 overflow-auto border-2 border-line">
            <table>
              <thead>
                <tr>
                  {preview.columns.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.preview.map((row, index) => (
                  <motion.tr key={index} {...rowMotion(index, ok)}>
                    {preview.columns.map((c) => (
                      <td key={c} className="max-w-56 min-w-24 text-[12px] truncate">
                        {row[c]}
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Validation & Row-Level Errors / Duplicate Detection */}
          {preview.skippedRows.length > 0 && (
            <div className="border-2 border-pink/60 bg-pink/5 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-display font-bold text-xs text-pink uppercase tracking-wide">
                  Row Validation &amp; Duplicate Filter ({preview.skippedRows.length} rows will be skipped)
                </span>
                <span className="text-[11px] text-muted">Duplicates and malformed rows excluded</span>
              </div>
              <div className="max-h-40 overflow-auto border border-line">
                <table>
                  <thead>
                    <tr>
                      <th className="w-16">Row #</th>
                      <th>Reason / Validation Failure</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.skippedRows.map((item, index) => (
                      <tr key={index} className="text-xs">
                        <td className="font-mono text-muted">{item.row}</td>
                        <td className="text-pink">{item.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex gap-3">
              <Button
                variant="primary"
                onClick={() => setShowConfirm(true)}
                disabled={!preview.ready || upload.busy || committing}
              >
                Import {preview.ready} {kind === "learners" ? "Trainees" : "Postings"}
              </Button>
              <Button
                small
                onClick={() => setShowMapping(!showMapping)}
                disabled={committing}
              >
                {showMapping ? "Hide Column Mapping" : "Edit Column Mapping"}
              </Button>
              <Button onClick={reset} disabled={committing}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal Card */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            className="mt-4 border-2 border-neon bg-bg p-5"
            initial={ok ? { opacity: 0, y: -8 } : false}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <h4 className="font-display m-0 text-base font-bold text-ink">
              Confirm Database Import
            </h4>
            <p className="mt-2 text-xs text-muted leading-relaxed">
              You are about to insert <strong className="text-neon">{preview?.ready} valid records</strong> from{" "}
              <span className="text-ink">{file?.name}</span> into the PostgreSQL database.
              {preview?.skippedRows.length > 0 && (
                <> {preview.skippedRows.length} rows with errors or duplicates will be ignored.</>
              )}
            </p>
            <div className="mt-4 flex gap-3">
              <Button
                variant="primary"
                loading={committing}
                disabled={committing}
                onClick={executeCommit}
              >
                {committing ? "Writing to database..." : "Yes, Proceed with Import"}
              </Button>
              <Button onClick={() => setShowConfirm(false)} disabled={committing}>
                Go Back
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Final Summary Card */}
      {result && (
        <div className="mt-4 border-2 border-neon bg-surface p-5" role="status">
          <div className="flex items-center gap-3">
            <span className="inline-block size-3 bg-neon" />
            <h3 className="font-display m-0 text-xl font-bold text-neon">
              Import Completed Successfully
            </h3>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 border-y border-line py-3 font-mono text-xs">
            <div>
              <span className="text-muted block">Records Inserted:</span>
              <span className="text-2xl font-bold text-neon">{result.inserted}</span>
            </div>
            <div>
              <span className="text-muted block">Records Skipped:</span>
              <span className="text-2xl font-bold text-pink">{result.skipped}</span>
            </div>
          </div>
          {result.skippedRows && result.skippedRows.length > 0 && (
            <div className="mt-3">
              <div className="text-xs text-muted mb-1 font-bold">Skipped Row Details:</div>
              <div className="max-h-36 overflow-auto border border-line text-xs">
                <table>
                  <tbody>
                    {result.skippedRows.map((r, i) => (
                      <tr key={i}>
                        <td className="w-16 font-mono text-muted">Row {r.row}</td>
                        <td className="text-pink">{r.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <div className="mt-4">
            <Button onClick={reset}>Upload another file</Button>
          </div>
        </div>
      )}
    </Window>
  );
}
