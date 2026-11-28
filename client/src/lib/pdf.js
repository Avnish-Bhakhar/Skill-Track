const WIDTH = 595;
const HEIGHT = 842;

const clean = (text) =>
  String(text)
    .replace(/[^\x20-\x7e]/g, "?")
    .replace(/[\\()]/g, "\\$&");

const rgb = (hex) => [1, 3, 5].map((i) => (parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(3)).join(" ");

export function createPage() {
  const ops = [];
  return {
    width: WIDTH,
    text(x, y, value, { size = 9, bold = false, color = "#000000", align = "left" } = {}) {
      const start = align === "right" ? x - String(value).length * size * 0.6 : x;
      ops.push(`BT /${bold ? "F2" : "F1"} ${size} Tf ${rgb(color)} rg ${start.toFixed(1)} ${(HEIGHT - y).toFixed(1)} Td (${clean(value)}) Tj ET`);
    },
    rect(x, y, width, height, color) {
      ops.push(`${rgb(color)} rg ${x.toFixed(1)} ${(HEIGHT - y - height).toFixed(1)} ${width.toFixed(1)} ${height.toFixed(1)} re f`);
    },
    toBytes() {
      const content = ops.join("\n");
      const font = (name) => `<< /Type /Font /Subtype /Type1 /BaseFont /${name} /Encoding /WinAnsiEncoding >>`;
      const objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${WIDTH} ${HEIGHT}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
        font("Courier"),
        font("Courier-Bold"),
        `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
      ];
      let out = "%PDF-1.4\n";
      const offsets = objects.map((body, i) => {
        const offset = out.length;
        out += `${i + 1} 0 obj\n${body}\nendobj\n`;
        return offset;
      });
      const xref = out.length;
      out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
      out += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
      out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
      return new TextEncoder().encode(out);
    },
  };
}
