"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Download, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FlowerLite } from "@/lib/flowers";
import { formatEuro } from "@/lib/pricing";
import { buildQuote } from "@/lib/quote-builder";
import { buildQuoteReference, downloadQuotePdf } from "@/lib/quote-pdf";
import { quoteContactSchema, type QuoteForm } from "@/lib/schemas/quote";
import { useQuoteStore } from "@/lib/store/quote-store";
import { SHOP } from "@/lib/shop";

export function QuoteSummary({
  form,
  catalog,
}: {
  form: QuoteForm;
  catalog: FlowerLite[];
}) {
  const contact = useQuoteStore((state) => state.contact);
  const patchContact = useQuoteStore((state) => state.patchContact);
  const sentReference = useQuoteStore((state) => state.sentReference);
  const setSentReference = useQuoteStore((state) => state.setSentReference);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  const built = useMemo(() => buildQuote(form, catalog), [form, catalog]);
  const reference = useMemo(() => buildQuoteReference(form), [form]);

  const send = async () => {
    const parsed = quoteContactSchema.safeParse(contact);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        next[String(issue.path[0])] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setSending(true);

    try {
      const response = await fetch("/api/devis", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          form,
          contact: parsed.data,
          estimatedTotal: built.quote.total,
        }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const message =
          typeof payload === "object" && payload !== null && "error" in payload
            ? String((payload as { error: unknown }).error)
            : "Envoi impossible pour le moment.";
        throw new Error(message);
      }
      const savedReference =
        typeof payload === "object" &&
        payload !== null &&
        "reference" in payload
          ? String((payload as { reference: unknown }).reference)
          : reference;
      setSentReference(savedReference);
      toast.success("Demande transmise à la boutique", {
        description: `Référence ${savedReference}. Nous revenons vers vous sous deux jours ouvrés.`,
      });
    } catch (error) {
      toast.error("L'envoi a échoué", {
        description:
          error instanceof Error
            ? error.message
            : "Réessayez ou appelez-nous directement.",
      });
    } finally {
      setSending(false);
    }
  };

  const mailBody = encodeURIComponent(
    [
      `Bonjour,`,
      ``,
      `Voici ma demande de devis (référence ${reference}) :`,
      `— Événement : ${form.eventType}, le ${form.date || "date à préciser"}`,
      `— Lieu : ${form.location}`,
      `— Invités : ${form.guests}`,
      `— Style : ${form.style}, palette ${form.palette.join(", ")}`,
      `— Estimation en ligne : ${formatEuro(built.quote.total)}`,
      ``,
      contact.message ?? "",
      ``,
      `${contact.name}`,
      contact.phone ?? "",
    ].join("\n"),
  );

  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-heading text-2xl">Votre devis</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Saison retenue d&apos;après votre date : {built.season}.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            { label: "Version sobre", value: built.quote.range.low },
            {
              label: "Recommandé",
              value: built.quote.range.recommended,
              highlight: true,
            },
            { label: "Version généreuse", value: built.quote.range.high },
          ].map((tier) => (
            <div
              key={tier.label}
              className={`rounded-xl border p-4 ${
                tier.highlight
                  ? "border-poppy bg-poppy/5"
                  : "border-border bg-card"
              }`}
            >
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                {tier.label}
              </p>
              <p className="mt-1.5 font-heading text-2xl">
                {formatEuro(tier.value)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        {built.quote.pieces.map((piece) => (
          <article
            key={piece.pieceId}
            className="rounded-xl border border-border bg-card p-4"
          >
            <header className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-heading text-lg">
                {piece.label}
                {piece.quantity > 1 ? (
                  <span className="text-muted-foreground">
                    {" "}
                    × {piece.quantity}
                  </span>
                ) : null}
              </h3>
              <p className="tabular-nums">{formatEuro(piece.total)}</p>
            </header>

            <table className="mt-3 w-full text-sm">
              <caption className="sr-only">
                Composition de {piece.label}
              </caption>
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  <th scope="col" className="pb-1.5 font-normal">
                    Fleur
                  </th>
                  <th scope="col" className="pb-1.5 text-right font-normal">
                    Qté
                  </th>
                  <th scope="col" className="pb-1.5 text-right font-normal">
                    P.U.
                  </th>
                  <th scope="col" className="pb-1.5 text-right font-normal">
                    Sous-total
                  </th>
                </tr>
              </thead>
              <tbody>
                {piece.lines.map((line) => (
                  <tr key={line.flowerId} className="border-t border-border/70">
                    <td className="py-1.5 pr-2">
                      {line.nameFr}
                      {line.availability !== "en saison" ? (
                        <span className="ml-1.5 text-xs text-poppy">
                          {line.availability === "import"
                            ? "import"
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
                <tr className="border-t border-border">
                  <td
                    className="py-1.5 italic text-muted-foreground"
                    colSpan={3}
                  >
                    Main-d&apos;œuvre par pièce
                  </td>
                  <td className="py-1.5 text-right tabular-nums">
                    {formatEuro(piece.labourPerUnit)}
                  </td>
                </tr>
              </tbody>
            </table>
          </article>
        ))}
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h3 className="font-heading text-lg">Récapitulatif</h3>
        <dl className="mt-3 space-y-1.5 text-sm">
          <Row label="Fleurs" value={formatEuro(built.quote.flowersTotal)} />
          <Row
            label="Main-d'œuvre"
            value={formatEuro(built.quote.labourTotal)}
          />
          {built.quote.offSeasonSurcharge > 0 ? (
            <Row
              label="dont majoration hors saison"
              value={formatEuro(built.quote.offSeasonSurcharge)}
              muted
            />
          ) : null}
          <Row
            label="Livraison sur le lieu"
            value={formatEuro(built.quote.delivery)}
          />
          {built.quote.installation > 0 ? (
            <Row
              label="Installation sur place"
              value={formatEuro(built.quote.installation)}
            />
          ) : null}
          <div className="flex items-baseline justify-between border-t border-border pt-2 font-medium">
            <dt>Total TTC</dt>
            <dd className="tabular-nums">{formatEuro(built.quote.total)}</dd>
          </div>
          <Row
            label="dont TVA 20 %"
            value={formatEuro(built.quote.vatIncluded)}
            muted
          />
        </dl>
      </section>

      {built.adjustments.length > 0 || built.quote.warnings.length > 0 ? (
        <section className="rounded-xl border border-poppy/40 bg-poppy/5 p-4">
          <h3 className="font-heading text-lg">Nos arbitrages</h3>
          <ul className="mt-2 space-y-1.5 text-sm">
            {[...built.adjustments, ...built.quote.warnings].map((line) => (
              <li key={line}>— {line}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-heading text-lg">Recevoir et envoyer ce devis</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field
            id="devis-nom"
            label="Votre nom"
            value={contact.name}
            error={errors.name}
            onChange={(value) => patchContact({ name: value })}
            autoComplete="name"
          />
          <Field
            id="devis-email"
            label="Votre e-mail"
            type="email"
            value={contact.email}
            error={errors.email}
            onChange={(value) => patchContact({ email: value })}
            autoComplete="email"
          />
          <Field
            id="devis-tel"
            label="Téléphone (facultatif)"
            type="tel"
            value={contact.phone ?? ""}
            error={errors.phone}
            onChange={(value) => patchContact({ phone: value })}
            autoComplete="tel"
          />
          <div className="sm:col-span-2">
            <Label htmlFor="devis-message" className="text-sm">
              Un mot pour la boutique (facultatif)
            </Label>
            <Textarea
              id="devis-message"
              className="mt-1.5"
              rows={3}
              value={contact.message ?? ""}
              onChange={(event) =>
                patchContact({ message: event.target.value })
              }
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              downloadQuotePdf({ form, built, contact, reference });
              toast.success("Devis téléchargé", {
                description: `${reference}.pdf`,
              });
            }}
          >
            <Download aria-hidden /> Télécharger le PDF
          </Button>
          <Button type="button" onClick={send} disabled={sending}>
            <Send aria-hidden /> {sending ? "Envoi…" : "Envoyer à la boutique"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            nativeButton={false}
            render={
              <a
                href={`mailto:${SHOP.email}?subject=${encodeURIComponent(`Demande de devis ${reference}`)}&body=${mailBody}`}
              />
            }
          >
            Ouvrir dans ma messagerie
          </Button>
        </div>

        {sentReference ? (
          <p className="mt-4 flex items-center gap-2 rounded-lg bg-leaf/10 px-3 py-2.5 text-sm">
            <CheckCircle2 className="size-4 text-leaf" aria-hidden />
            Demande enregistrée sous la référence {sentReference}. Nous vous
            répondons sous deux jours ouvrés.
          </p>
        ) : null}

        <p className="mt-4 text-xs text-muted-foreground">
          Devis estimatif, non contractuel. Les prix sont susceptibles de varier
          selon la disponibilité du marché aux fleurs.
        </p>
      </section>
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

function Field({
  id,
  label,
  value,
  onChange,
  error,
  type = "text",
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <Label htmlFor={id} className="text-sm">
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-erreur` : undefined}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5"
      />
      {error ? (
        <p id={`${id}-erreur`} className="mt-1 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
