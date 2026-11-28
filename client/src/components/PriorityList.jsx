import { motion } from "framer-motion";
import { SECTOR } from "../lib/format";
import { rowMotion, useMotionOk } from "../lib/motion";
import { Empty } from "./ui";

export default function PriorityList({ rows, detailed }) {
  const ok = useMotionOk();
  if (!rows.length) return <Empty>No gaps in this view. Either all is well or there are no job postings.</Empty>;
  return (
    <ol className="m-0 list-none p-0">
      {rows.map((row, index) => (
        <motion.li key={row.skillId} className="flex gap-3 border-b border-line py-2.5 last:border-b-0" {...rowMotion(index, ok)}>
          <span className={`font-pixel w-8 text-2xl leading-none ${index === 0 ? "text-pink" : "text-muted"}`}>{index + 1}</span>
          <div className="min-w-0 flex-1">
            <div className="font-bold">{row.name}</div>
            <div className="text-[12px] text-muted">
              Demand {row.demandPct}% | Supply {row.supplyPct}%
              {detailed && ` | Verified ${row.verifiedSupplyPct}% | ${SECTOR[row.sector]}`}
              {!row.covered && <span className="text-pink"> | not in curriculum</span>}
            </div>
          </div>
          <div className="text-right">
            <div className="font-pixel text-2xl leading-none">{row.priority}</div>
            <div className="text-[11px] text-muted">priority</div>
          </div>
        </motion.li>
      ))}
    </ol>
  );
}
