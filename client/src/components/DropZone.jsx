import { motion } from "framer-motion";
import { useRef, useState } from "react";
import { useMotionOk } from "../lib/motion";
import { colors } from "../lib/theme";
import { Button } from "./ui";

export default function DropZone({ accept, onFile, progress, busy }) {
  const input = useRef(null);
  const [over, setOver] = useState(false);
  const ok = useMotionOk();

  const take = (files) => {
    setOver(false);
    if (files?.[0] && !busy) onFile(files[0]);
  };

  return (
    <motion.div
      className="border-2 border-dashed border-line bg-bg p-6 text-center"
      initial={false}
      animate={{ borderColor: over ? colors.neon : colors.line, y: over && ok ? -4 : 0 }}
      transition={{ duration: ok ? 0.15 : 0 }}
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOver(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        take(event.dataTransfer.files);
      }}
    >
      <p className="mb-3">{over ? "Let go." : `Drop a ${accept} file here, or`}</p>
      <Button onClick={() => input.current.click()} disabled={busy}>
        Choose file
      </Button>
      <input
        ref={input}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => {
          take(event.target.files);
          event.target.value = "";
        }}
      />
      {busy && (
        <div className="mt-4 text-left" role="status">
          <div className="h-3 border-2 border-line">
            <motion.div className="h-full bg-neon" initial={false} animate={{ width: `${progress}%` }} transition={{ duration: ok ? 0.15 : 0 }} />
          </div>
          <div className="mt-1 text-[12px] text-muted">{progress < 100 ? `Uploading ${progress}%` : "Uploaded. Reading it..."}</div>
        </div>
      )}
    </motion.div>
  );
}
