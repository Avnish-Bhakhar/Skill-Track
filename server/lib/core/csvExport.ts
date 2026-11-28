function cell(value: unknown) {
  let text = String(value ?? "");
  if (/^[=@\t\r]/.test(text) || (/^[+-]/.test(text) && !/^[+-]?[\d ]+$/.test(text))) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export const toCsv = (header: string[], rows: unknown[][]) =>
  [header, ...rows].map((row) => row.map(cell).join(",")).join("\r\n") + "\r\n";
