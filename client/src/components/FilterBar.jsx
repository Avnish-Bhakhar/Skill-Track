import { SECTOR } from "../lib/format";
import { useData } from "../lib/useData";
import { useQueryParams } from "../lib/useQueryParams";
import { Button, Check, ErrorNote, Field, Select } from "./ui";

export const useFilterOptions = () => useData("/filters");

export default function FilterBar({
  options,
  categories = [],
  show = ["district", "program", "batch", "from", "to"],
}) {
  const [params, setParams, clear] = useQueryParams();
  const has = (key) => show.includes(key);
  const change = (key) => (event) => setParams({ [key]: event.target.value });
  const data = options.data;

  const select = (key, label, all, items) =>
    has(key) && (
      <Field label={label} className="min-w-36 flex-1">
        <Select value={params[key] ?? ""} onChange={change(key)}>
          <option value="">{all}</option>
          {items.map(([value, text]) => (
            <option key={value} value={value}>
              {text}
            </option>
          ))}
        </Select>
      </Field>
    );

  return (
    <div className="mb-6">
      <ErrorNote onRetry={options.reload}>{options.error}</ErrorNote>
      <div className="flex flex-wrap items-end gap-3 border-y-2 border-line bg-surface/40 px-3 py-3">
        {has("search") && (
          <Field label="Search trainee or phone" className="min-w-44 flex-1">
            <input
              type="search"
              placeholder="e.g. Priya or 9822..."
              className="field"
              value={params.search ?? ""}
              onChange={change("search")}
            />
          </Field>
        )}
        {select("sector", "Sector", "All sectors", Object.entries(SECTOR))}
        {has("category") && categories.length > 0 && (
          <Field label="Skill Category" className="min-w-40 flex-1">
            <Select value={params.category ?? ""} onChange={change("category")}>
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {select("district", "District", "All districts", (data?.districts ?? []).map((d) => [d, d]))}
        {select("program", "Program", "All programs", (data?.programs ?? []).map((p) => [p.id, p.name]))}
        {select("batch", "Batch", "All batches", (data?.batches ?? []).map((b) => [b, b]))}
        {select("status", "Job Status", "Any status", [
          ["EMPLOYED", "Employed"],
          ["SELF_EMPLOYED", "Self-employed"],
          ["NOT_EMPLOYED", "Not employed"],
          ["none", "No answer yet"],
        ])}
        {has("from") && (
          <Field label="Enrolled From" className="min-w-36">
            <input type="date" className="field" value={params.from ?? ""} onChange={change("from")} />
          </Field>
        )}
        {has("to") && (
          <Field label="Enrolled To" className="min-w-36">
            <input type="date" className="field" value={params.to ?? ""} onChange={change("to")} />
          </Field>
        )}
        {has("verified") && (
          <div className="py-2">
            <Check checked={params.verified === "1"} onChange={(on) => setParams({ verified: on ? "1" : "" })}>
              Verified skills only
            </Check>
          </div>
        )}
        <div className="flex gap-2">
          <Button small onClick={clear} disabled={!Object.keys(params).length}>
            Clear filters
          </Button>
        </div>
      </div>
    </div>
  );
}
