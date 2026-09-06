import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { formatEuro } from "@/lib/pricing";
import type { BuiltQuote } from "@/lib/quote-builder";
import type { QuoteContact, QuoteForm } from "@/lib/schemas/quote";
import { SHOP, formatOpeningSummary, formatPostalAddress } from "@/lib/shop";

/**
 * Devis PDF à en-tête de la boutique, prêt à être envoyé.
 * Généré entièrement dans le navigateur : aucune donnée ne quitte le poste
 * du client tant qu'il n'a pas cliqué sur « Envoyer à la boutique ».
 */

const INK = "#241A12";
const MUTED = "#6B5B4D";
const ACCENT = "#D93A1E";

function formatFrenchDate(iso: string): string {
  if (!iso) return "date à préciser";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "date à préciser";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(date);
}

export function buildQuoteReference(form: QuoteForm, now = new Date()): string {
  const stamp = now.toISOString().slice(2, 10).replace(/-/g, "");
  const seed = `${form.eventType}${form.location}${form.date}`
    .split("")
    .reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 9973, 7);
  return `DEV-${stamp}-${String(seed).padStart(4, "0")}`;
}

export function generateQuotePdf({
  form,
  built,
  contact,
  reference,
}: {
  form: QuoteForm;
  built: BuiltQuote;
  contact?: QuoteContact;
  reference: string;
}): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const marginX = 16;
  let y = 18;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(INK);
  doc.setFontSize(20);
  doc.text(SHOP.name, marginX, y);

  doc.setFontSize(9);
  doc.setTextColor(MUTED);
  y += 6;
  doc.text(SHOP.tagline, marginX, y);
  y += 4.5;
  doc.text(`${formatPostalAddress()} — ${SHOP.phoneDisplay} — ${SHOP.email}`, marginX, y);
  y += 4.5;
  doc.text(formatOpeningSummary(), marginX, y);

  doc.setDrawColor(220, 212, 198);
  y += 5;
  doc.line(marginX, y, 210 - marginX, y);

  y += 9;
  doc.setTextColor(INK);
  doc.setFontSize(15);
  doc.text(`Devis estimatif — ${form.eventType}`, marginX, y);

  y += 6;
  doc.setFontSize(9.5);
  doc.setTextColor(MUTED);
  doc.text(
    `Référence ${reference} — établi le ${formatFrenchDate(new Date().toISOString().slice(0, 10))}`,
    marginX,
    y,
  );

  y += 8;
  doc.setTextColor(INK);
  doc.setFontSize(10);
  const details = [
    `Date de l'événement : ${formatFrenchDate(form.date)} (saison ${built.season})`,
    `Lieu : ${form.location || "à préciser"}`,
    `Invités : ${form.guests}`,
    `Style : ${form.style} — palette : ${form.palette.join(", ")}`,
    contact ? `Client : ${contact.name} — ${contact.email}${contact.phone ? ` — ${contact.phone}` : ""}` : null,
  ].filter((line): line is string => line !== null);

  for (const line of details) {
    doc.text(line, marginX, y);
    y += 5;
  }

  y += 3;

  for (const piece of built.quote.pieces) {
    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [
        [
          `${piece.label}${piece.quantity > 1 ? ` × ${piece.quantity}` : ""}`,
          "Qté / pièce",
          "Prix unitaire",
          "Sous-total",
        ],
      ],
      body: [
        ...piece.lines.map((line) => [
          line.nameFr +
            (line.availability !== "en saison"
              ? ` (${line.availability === "import" ? "import hors saison" : "hors saison"})`
              : ""),
          String(line.quantity),
          formatEuro(line.unitPrice),
          formatEuro(line.total),
        ]),
        [
          { content: "Fleurs (style appliqué)", styles: { fontStyle: "italic" as const } },
          "",
          "",
          formatEuro(piece.flowersPerUnit),
        ],
        [
          { content: "Main-d'œuvre", styles: { fontStyle: "italic" as const } },
          "",
          "",
          formatEuro(piece.labourPerUnit),
        ],
        [
          { content: `Total ${piece.label}`, styles: { fontStyle: "bold" as const } },
          "",
          "",
          { content: formatEuro(piece.total), styles: { fontStyle: "bold" as const } },
        ],
      ],
      theme: "grid",
      styles: { fontSize: 8.5, cellPadding: 1.8, textColor: INK, lineColor: [234, 220, 200] },
      headStyles: { fillColor: [242, 228, 212], textColor: INK, fontStyle: "bold" },
      columnStyles: {
        1: { halign: "right", cellWidth: 24 },
        2: { halign: "right", cellWidth: 28 },
        3: { halign: "right", cellWidth: 28 },
      },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  }

  const summary: string[][] = [
    ["Fleurs", formatEuro(built.quote.flowersTotal)],
    ["Main-d'œuvre", formatEuro(built.quote.labourTotal)],
  ];
  if (built.quote.offSeasonSurcharge > 0) {
    summary.push(["dont majoration hors saison", formatEuro(built.quote.offSeasonSurcharge)]);
  }
  summary.push(["Livraison sur le lieu", formatEuro(built.quote.delivery)]);
  if (built.quote.installation > 0) {
    summary.push(["Installation sur place", formatEuro(built.quote.installation)]);
  }
  summary.push(["Total TTC", formatEuro(built.quote.total)]);
  summary.push(["dont TVA 20 %", formatEuro(built.quote.vatIncluded)]);

  autoTable(doc, {
    startY: y,
    margin: { left: 110, right: marginX },
    body: summary,
    theme: "plain",
    styles: { fontSize: 9.5, cellPadding: 1.6, textColor: INK },
    columnStyles: { 1: { halign: "right" } },
    didParseCell: (data) => {
      if (data.row.index === summary.length - 2) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fontSize = 11;
      }
    },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  doc.setFontSize(11);
  doc.setTextColor(ACCENT);
  doc.text("Fourchette de prix", marginX, y);
  y += 6;
  doc.setFontSize(10);
  doc.setTextColor(INK);
  doc.text(
    `Version sobre ${formatEuro(built.quote.range.low)}  ·  Recommandé ${formatEuro(built.quote.range.recommended)}  ·  Version généreuse ${formatEuro(built.quote.range.high)}`,
    marginX,
    y,
  );
  y += 9;

  const remarks = [...built.adjustments, ...built.quote.warnings];
  if (remarks.length > 0) {
    doc.setFontSize(11);
    doc.setTextColor(ACCENT);
    doc.text("Arbitrages et remarques", marginX, y);
    y += 6;
    doc.setFontSize(9);
    doc.setTextColor(INK);
    for (const remark of remarks.slice(0, 12)) {
      const lines = doc.splitTextToSize(`— ${remark}`, 178) as string[];
      for (const line of lines) {
        if (y > 275) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, marginX, y);
        y += 4.4;
      }
    }
    y += 4;
  }

  if (form.constraints.notes) {
    doc.setFontSize(9);
    doc.setTextColor(MUTED);
    const notes = doc.splitTextToSize(`Précisions du client : ${form.constraints.notes}`, 178) as string[];
    for (const line of notes) {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, marginX, y);
      y += 4.4;
    }
    y += 4;
  }

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFontSize(7.6);
    doc.setTextColor(MUTED);
    doc.text(
      "Devis estimatif, non contractuel. Les prix sont susceptibles de varier selon la disponibilité du marché aux fleurs.",
      marginX,
      288,
    );
    doc.text(`${page} / ${pageCount}`, 210 - marginX, 288, { align: "right" });
  }

  return doc;
}

export function downloadQuotePdf(args: Parameters<typeof generateQuotePdf>[0]): void {
  generateQuotePdf(args).save(`${args.reference}.pdf`);
}
