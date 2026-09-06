"use client";

import { AlertTriangle } from "lucide-react";

import { formatEuro, type BouquetQuote } from "@/lib/pricing";

/** Détail ligne à ligne du prix, replié par défaut sous la barre collante. */
export function PriceDetail({ quote }: { quote: BouquetQuote }) {
  if (quote.lines.length === 0) {
    return (
      <p className="px-1 py-4 text-sm text-muted-foreground">
        Le détail apparaîtra dès la première fleur ajoutée.
      </p>
    );
  }

  return (
    <div className="space-y-4 py-2">
      <table className="w-full text-sm">
        <caption className="sr-only">Détail du prix du bouquet</caption>
        <thead>
          <tr className="text-left text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <th scope="col" className="pb-2 font-normal">
              Fleur
            </th>
            <th scope="col" className="pb-2 text-right font-normal">
              Qté
            </th>
            <th scope="col" className="pb-2 text-right font-normal">
              Unité
            </th>
            <th scope="col" className="pb-2 text-right font-normal">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {quote.lines.map((line) => (
            <tr key={line.flowerId} className="border-t border-border/70">
              <td className="py-1.5 pr-2">
                {line.nameFr}
                {line.availability !== "en saison" ? (
                  <span className="ml-1.5 text-xs text-poppy">
                    {line.availability === "import"
                      ? `import ×${line.seasonCoefficient}`
                      : "hors saison"}
                  </span>
                ) : null}
              </td>
              <td className="py-1.5 text-right tabular-nums">
                {line.quantity}
              </td>
              <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                {formatEuro(line.unitPrice)}
              </td>
              <td className="py-1.5 text-right tabular-nums">
                {formatEuro(line.total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="space-y-1.5 border-t border-border pt-3 text-sm">
        {quote.styleCoefficient !== 1 ? (
          <Row
            label={`Travail du style (×${quote.styleCoefficient})`}
            value={formatEuro(
              quote.flowersTotal - quote.flowersTotal / quote.styleCoefficient,
            )}
          />
        ) : null}
        {quote.offSeasonSurcharge > 0 ? (
          <Row
            label="dont majoration hors saison"
            value={formatEuro(quote.offSeasonSurcharge)}
            muted
          />
        ) : null}
        <Row label="Fleurs" value={formatEuro(quote.flowersTotal)} />
        <Row
          label={`Main-d'œuvre (${quote.stemCount} tiges)`}
          value={formatEuro(quote.labour)}
        />
        <Row
          label={quote.wrapping.label}
          value={formatEuro(quote.wrapping.amount)}
        />
        {quote.extras.map((extra) => (
          <Row
            key={extra.label}
            label={extra.label}
            value={formatEuro(extra.amount)}
          />
        ))}
        <Row
          label={quote.delivery.label}
          value={formatEuro(quote.delivery.amount)}
        />
        <div className="flex items-baseline justify-between border-t border-border pt-2 font-medium">
          <dt>Total TTC</dt>
          <dd className="tabular-nums">{formatEuro(quote.total)}</dd>
        </div>
        <Row
          label="dont TVA 20 %"
          value={formatEuro(quote.vatIncluded)}
          muted
        />
      </dl>

      {quote.warnings.length > 0 ? (
        <ul className="space-y-1.5 rounded-lg border border-poppy/40 bg-poppy/5 p-3 text-sm">
          {quote.warnings.map((warning) => (
            <li key={warning} className="flex gap-2">
              <AlertTriangle
                className="mt-0.5 size-4 shrink-0 text-poppy"
                aria-hidden
              />
              <span>{warning}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Prix estimatif, non contractuel. Les tarifs varient selon la
        disponibilité du marché aux fleurs.
      </p>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between ${muted ? "text-muted-foreground" : ""}`}
    >
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
