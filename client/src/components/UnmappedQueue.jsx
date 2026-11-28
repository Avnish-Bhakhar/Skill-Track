import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { api, errorText } from "../lib/api";
import { SECTOR } from "../lib/format";
import { rowMotion, useMotionOk } from "../lib/motion";
import { useData } from "../lib/useData";
import { Button, Empty, ErrorNote, Select } from "./ui";

export default function UnmappedQueue({ items, onChange }) {
  const ok = useMotionOk();
  const skills = useData("/skills");
  const [picked, setPicked] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  async function act(id, body) {
    setBusy(id);
    setError("");
    try {
      await api.patch(`/unmapped/${id}`, body);
      onChange();
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      setBusy("");
    }
  }

  if (!items.length) return <Empty>Queue is empty. Every term found a home.</Empty>;

  return (
    <>
      <ErrorNote>{error || skills.error}</ErrorNote>
      <ul className="m-0 list-none p-0">
        <AnimatePresence initial={false}>
          {items.map((item, index) => (
            <motion.li key={item.id} className="border-b border-line py-3 last:border-b-0" {...rowMotion(index, ok)} exit={ok ? { opacity: 0 } : undefined}>
              <div className="mb-2 flex justify-between gap-3">
                <span className="font-bold">{item.term}</span>
                <span className="text-[12px] whitespace-nowrap text-muted">seen {item.count}x</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="min-w-44 flex-1">
                  <Select
                    aria-label={`Skill for ${item.term}`}
                    value={picked[item.id] ?? ""}
                    onChange={(e) => setPicked({ ...picked, [item.id]: e.target.value })}
                  >
                    <option value="">Map to skill...</option>
                    {Object.entries(SECTOR).map(([sector, label]) => (
                      <optgroup key={sector} label={label}>
                        {(skills.data?.skills ?? [])
                          .filter((s) => s.sector === sector)
                          .map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                      </optgroup>
                    ))}
                  </Select>
                </div>
                <Button small disabled={!picked[item.id] || busy === item.id} onClick={() => act(item.id, { action: "resolve", skillId: picked[item.id] })}>
                  Map
                </Button>
                <Button small disabled={busy === item.id} onClick={() => act(item.id, { action: "ignore" })}>
                  Ignore
                </Button>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </>
  );
}
