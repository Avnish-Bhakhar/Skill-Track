import CsvPanel from "../components/CsvPanel";
import PdfPanel from "../components/PdfPanel";
import { PageHead } from "../components/ui";

export default function Upload() {
  return (
    <>
      <PageHead title="Upload" note="Nothing is saved until you press the confirm button." />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <CsvPanel />
        <PdfPanel />
      </div>
    </>
  );
}
