import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Logo } from "../components/Logo";
import { Button, ErrorNote, Field, Loading, Select, Tag, Window } from "../components/ui";
import { api, errorText } from "../lib/api";

const STATUSES = [
  ["EMPLOYED", "I have a job"],
  ["SELF_EMPLOYED", "I work for myself"],
  ["NOT_EMPLOYED", "Not working right now"],
];

const BANDS = [
  ["below-10k", "Below Rs 10,000"],
  ["10k-15k", "Rs 10,000 to 15,000"],
  ["15k-20k", "Rs 15,000 to 20,000"],
  ["20k-30k", "Rs 20,000 to 30,000"],
  ["above-30k", "Above Rs 30,000"],
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function CheckIn() {
  const { token } = useParams();
  const [learner, setLearner] = useState(null);
  const [closed, setClosed] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ status: "", employer: "", role: "", salaryBand: "", month: "", year: "" });
  const thisYear = new Date().getFullYear();

  useEffect(() => {
    api
      .get(`/checkin/${encodeURIComponent(token)}`)
      .then((response) => setLearner(response.data))
      .catch((failure) => setClosed(errorText(failure)));
  }, [token]);

  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });
  const working = form.status === "EMPLOYED" || form.status === "SELF_EMPLOYED";

  async function submit(event) {
    event.preventDefault();
    if (!form.status) {
      setError("Pick your job status.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { month, year, ...answers } = form;
      await api.post(`/checkin/${encodeURIComponent(token)}`, { ...answers, startMonth: month && year ? `${year}-${month}` : "" });
      setDone(true);
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-4 py-6">
      <div className="mb-5">
        <Logo />
      </div>

      {closed && (
        <Window title="LINK.ERR">
          <p className="m-0">{closed}</p>
        </Window>
      )}
      {!closed && !learner && <Loading>Checking your link...</Loading>}

      {done && (
        <Window title="SAVED.OK">
          <h1 className="headline mt-1 mb-4 text-4xl">Thank you.</h1>
          <p className="m-0">Your answer is saved. You can close this page. The link will not open again.</p>
        </Window>
      )}

      {learner && !done && !closed && (
        <>
          <Tag tone="yellow">30 seconds, promise</Tag>
          <h1 className="headline mt-4 mb-2 text-4xl">Working now, {learner.firstName}?</h1>
          <p className="mb-4 text-muted">About life after your {learner.program} course.</p>
          <Window title="CHECKIN.EXE">
            <form onSubmit={submit} className="space-y-4">
              <fieldset className="space-y-3 border-0 p-0">
                <legend className="mb-2 text-[12px] text-muted">Job status</legend>
                {STATUSES.map(([value, label]) => (
                  <label key={value} className={`flex cursor-pointer gap-3 border-2 p-3 ${form.status === value ? "border-neon" : "border-line"}`}>
                    <input type="radio" name="status" value={value} checked={form.status === value} onChange={set("status")} className="sr-only" />
                    <span className="text-neon">{form.status === value ? "(x)" : "( )"}</span>
                    {label}
                  </label>
                ))}
              </fieldset>
              {working && (
                <>
                  <Field label={form.status === "EMPLOYED" ? "Employer" : "Business name (if it has one)"}>
                    <input className="field" maxLength={120} required={form.status === "EMPLOYED"} value={form.employer} onChange={set("employer")} />
                  </Field>
                  <Field label="Your work or role">
                    <input className="field" maxLength={120} required value={form.role} onChange={set("role")} />
                  </Field>
                  <Field label="Monthly earning">
                    <Select required value={form.salaryBand} onChange={set("salaryBand")}>
                      <option value="">Pick a range</option>
                      {BANDS.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Started in month">
                      <Select required value={form.month} onChange={set("month")}>
                        <option value="">Month</option>
                        {MONTHS.map((m, i) => (
                          <option key={m} value={String(i + 1).padStart(2, "0")}>
                            {m}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Year">
                      <Select required value={form.year} onChange={set("year")}>
                        <option value="">Year</option>
                        {Array.from({ length: 6 }, (_, i) => thisYear - i).map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                </>
              )}
              <ErrorNote>{error}</ErrorNote>
              <Button variant="primary" type="submit" disabled={busy} className="w-full">
                {busy ? "Sending..." : "Send my answer"}
              </Button>
              <p className="m-0 text-[12px] text-muted">
                Used by the skilling department to check how its courses did. <Link to="/privacy" className="text-muted underline">Privacy</Link>
              </p>
            </form>
          </Window>
        </>
      )}
    </main>
  );
}
