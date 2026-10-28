import { jsPDF } from "jspdf";
import type { Notebook } from "./notebook-data.ts";
import { evaluate, getExperiment } from "./experiments.ts";

function datePt(value: string) {
  const time = new Date(value);
  return Number.isFinite(time.getTime())
    ? time.toLocaleString("pt-BR")
    : "Data não informada";
}
function asBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(new Error("Não foi possível ler a fonte do PDF."));
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.readAsDataURL(blob);
  });
}
export async function makeNotebookPdf(
  book: Notebook,
  owner = "Meu caderno",
): Promise<jsPDF> {
  const fontResponse = await fetch("/DejaVuSans.ttf");
  if (!fontResponse.ok) throw new Error("Fonte do relatório indisponível.");
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  doc.addFileToVFS("DejaVuSans.ttf", await asBase64(await fontResponse.blob()));
  doc.addFont("DejaVuSans.ttf", "DejaVu", "normal");
  doc.setFont("DejaVu", "normal");
  doc.setProperties({
    title: "Caderno TermoLab",
    subject: "Investigações de termoquímica",
    author: "TermoLab",
  });
  const left = 18,
    right = 192,
    width = right - left,
    bottom = 275;
  let y = 29;
  function page() {
    doc.addPage();
    y = 25;
  }
  function reserve(height: number) {
    if (y + height > bottom) page();
  }
  function line(
    text: string,
    size = 10,
    color: [number, number, number] = [27, 63, 87],
    leading = 5.6,
  ) {
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const wrapped = doc.splitTextToSize(text || "—", width) as string[];
    for (const segment of wrapped) {
      reserve(leading);
      doc.text(segment, left, y);
      y += leading;
    }
  }
  function section(title: string) {
    reserve(15);
    y += 4;
    doc.setDrawColor(210, 227, 237);
    doc.line(left, y, right, y);
    y += 7;
    line(title, 13, [0, 75, 128], 7);
  }
  function field(label: string, value: string) {
    reserve(10);
    line(label, 9, [92, 117, 135], 5);
    line(value, 10, [21, 62, 89], 5.8);
    y += 2;
  }
  line("Senac  |  TermoLab", 15, [0, 75, 128], 8);
  line("Caderno de cientista", 22, [0, 61, 102], 11);
  line(owner, 11, [0, 75, 128], 7);
  line(
    `Gerado em ${new Date().toLocaleString("pt-BR")}`,
    9,
    [100, 122, 137],
    6,
  );
  y += 5;
  line(
    `${book.snapshots.length} ensaio(s)  •  ${book.measurements.length} leitura(s)  •  ${book.solved.length} hipótese(s)  •  ${book.numericSolved.length} desafio(s) numérico(s)`,
    10,
    [21, 62, 89],
    6,
  );
  section("Ver · Pensar · Perguntar");
  field("01 / O QUE EU VI", book.notes.see.trim() || "Sem anotação.");
  field(
    "02 / O QUE ISSO ME FAZ PENSAR",
    book.notes.think.trim() || "Sem anotação.",
  );
  field(
    "03 / O QUE EU INVESTIGARIA AGORA",
    book.notes.ask.trim() || "Sem anotação.",
  );
  section("Ensaios guardados");
  if (!book.snapshots.length) line("Nenhum ensaio guardado.");
  book.snapshots.forEach((snapshot, index) => {
    const experiment = getExperiment(snapshot.mode),
      result = evaluate(snapshot.mode, snapshot.params, snapshot.progress);
    reserve(31);
    y += 3;
    line(
      `${index + 1}. ${experiment.name} · ${Math.round(snapshot.progress * 100)}%`,
      11,
      [0, 75, 128],
      6,
    );
    line(datePt(snapshot.date), 8, [100, 122, 137], 5);
    line(
      experiment.controls
        .map(
          (c) =>
            `${c.label}: ${c.options ? c.options[snapshot.params[c.key]] : snapshot.params[c.key] + " " + c.unit}`,
        )
        .join("  |  "),
      9,
      [27, 63, 87],
      5.3,
    );
    line(
      result.metrics
        .map(
          (m) =>
            `${m.label}: ${m.value.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} ${m.unit}`,
        )
        .join("  |  "),
      9,
      [27, 63, 87],
      5.3,
    );
  });
  section("Leituras registradas");
  if (!book.measurements.length) line("Nenhuma leitura registrada.");
  book.measurements.forEach((snapshot, index) => {
    const result = evaluate(snapshot.mode, snapshot.params, snapshot.progress);
    reserve(22);
    y += 2;
    line(
      `${index + 1}. ${getExperiment(snapshot.mode).name} · ${Math.round(snapshot.progress * 100)}% · ${datePt(snapshot.date)}`,
      9,
      [0, 75, 128],
      5.5,
    );
    line(
      result.metrics
        .map(
          (m) =>
            `${m.label}: ${m.value.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} ${m.unit}`,
        )
        .join("  |  "),
      9,
      [27, 63, 87],
      5.3,
    );
  });
  section("Progresso");
  line(
    `Hipóteses: ${book.solved.map((id) => getExperiment(id).name).join(", ") || "nenhuma"}.`,
    9,
  );
  line(
    `Desafios numéricos: ${book.numericSolved.map((id) => getExperiment(id).name).join(", ") || "nenhum"}.`,
    9,
  );
  const count = doc.getNumberOfPages();
  for (let n = 1; n <= count; n++) {
    doc.setPage(n);
    doc.setDrawColor(226, 235, 241);
    doc.line(left, 284, right, 284);
    doc.setFontSize(8);
    doc.setTextColor(100, 122, 137);
    doc.text("TermoLab · Relatório de investigação", left, 290);
    doc.text(`${n} / ${count}`, right, 290, { align: "right" });
  }
  return doc;
}
export async function downloadNotebookPdf(
  book: Notebook,
  owner = "Meu caderno",
) {
  const doc = await makeNotebookPdf(book, owner);
  const date = new Date().toISOString().slice(0, 10);
  doc.save(`caderno-termolab-${date}.pdf`);
}
