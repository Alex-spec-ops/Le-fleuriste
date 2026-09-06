"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Minus, Plus, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";

import { QuoteSummary } from "@/components/devis/quote-summary";
import { PetalMark } from "@/components/ornament/botanical";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { decodeBouquet } from "@/lib/bouquet-share";
import {
  COLORS,
  COLOR_SWATCHES,
  EVENT_TYPES,
  STYLES,
  type Color,
  type EventType,
  type Style,
} from "@/lib/constants";
import type { FlowerLite } from "@/lib/flowers";
import { EVENT_PIECES, formatEuro, type EventPieceId } from "@/lib/pricing";
import { suggestedTableCount } from "@/lib/quote-builder";
import { useQuoteStore } from "@/lib/store/quote-store";
import { cn } from "@/lib/utils";

const STEPS = [
  "Événement",
  "Date et lieu",
  "Invités",
  "Pièces florales",
  "Palette",
  "Style",
  "Budget",
  "Contraintes",
  "Votre devis",
] as const;

export function QuoteWizard({ flowers }: { flowers: FlowerLite[] }) {
  const searchParams = useSearchParams();
  const form = useQuoteStore((state) => state.form);
  const step = useQuoteStore((state) => state.step);
  const patch = useQuoteStore((state) => state.patch);
  const patchConstraints = useQuoteStore((state) => state.patchConstraints);
  const setStep = useQuoteStore((state) => state.setStep);
  const reset = useQuoteStore((state) => state.reset);

  const [error, setError] = useState<string | null>(null);

  // Composition venue du composeur : ses fleurs deviennent des fleurs imposées.
  // Un ref plutôt qu'un état : l'import n'a rien à afficher, il ne doit donc
  // pas déclencher de rendu supplémentaire.
  const imported = useRef(false);
  useEffect(() => {
    if (imported.current) return;
    const token = searchParams.get("bouquet");
    if (!token) return;
    imported.current = true;
    const bouquet = decodeBouquet(token);
    if (!bouquet) return;
    const ids = Object.keys(bouquet.items).slice(0, 30);
    if (ids.length === 0) return;
    patchConstraints({ requiredFlowerIds: ids });
    patch({ style: bouquet.style });
    toast.success("Composition reprise du composeur", {
      description: `${ids.length} variété${ids.length > 1 ? "s" : ""} ajoutée${ids.length > 1 ? "s" : ""} aux fleurs imposées.`,
    });
  }, [searchParams, patch, patchConstraints]);

  const totalPieces = useMemo(
    () =>
      Object.values(form.pieces).reduce(
        (sum, quantity) => sum + (quantity ?? 0),
        0,
      ),
    [form.pieces],
  );

  const validateStep = (index: number): string | null => {
    switch (index) {
      case 1:
        if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date))
          return "Indiquez la date de l'événement.";
        if (form.location.trim().length < 2)
          return "Indiquez au moins la ville.";
        return null;
      case 3:
        return totalPieces === 0
          ? "Choisissez au moins une pièce florale."
          : null;
      case 4:
        return form.palette.length === 0
          ? "Choisissez au moins une teinte."
          : null;
      default:
        return null;
    }
  };

  const goNext = () => {
    const message = validateStep(step);
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    setStep(Math.min(STEPS.length - 1, step + 1));
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8">
      <div className="mb-8">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Étape {step + 1} sur {STEPS.length} — {STEPS[step]}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              reset();
              toast("Devis réinitialisé");
            }}
          >
            <RotateCcw aria-hidden /> Recommencer
          </Button>
        </div>
        <Progress
          value={progress}
          className="mt-3"
          aria-label="Progression du devis"
        />
      </div>

      <div className="min-h-[22rem]">
        {step === 0 ? (
          <Step title="Quel événement préparez-vous ?">
            <div className="grid gap-2 sm:grid-cols-2">
              {EVENT_TYPES.map((type) => (
                <ChoiceCard
                  key={type}
                  label={type}
                  selected={form.eventType === type}
                  onSelect={() => patch({ eventType: type as EventType })}
                  description={DESCRIPTIONS[type]}
                />
              ))}
            </div>
          </Step>
        ) : null}

        {step === 1 ? (
          <Step
            title="Quand et où ?"
            hint="La date détermine la saison : les fleurs hors saison sont signalées et majorées."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="date" className="text-sm">
                  Date de l&apos;événement
                </Label>
                <Input
                  id="date"
                  type="date"
                  className="mt-1.5"
                  value={form.date}
                  onChange={(event) => patch({ date: event.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="lieu" className="text-sm">
                  Lieu (ville, domaine, salle)
                </Label>
                <Input
                  id="lieu"
                  className="mt-1.5"
                  value={form.location}
                  placeholder="Paris, domaine des Fontaines…"
                  onChange={(event) => patch({ location: event.target.value })}
                />
              </div>
            </div>
          </Step>
        ) : null}

        {step === 2 ? (
          <Step
            title="Combien d'invités ?"
            hint="Nous en déduisons le nombre de centres de table, que vous pourrez ajuster."
          >
            <div className="max-w-xs">
              <Label htmlFor="invites" className="text-sm">
                Nombre d&apos;invités
              </Label>
              <Input
                id="invites"
                type="number"
                min={0}
                max={2000}
                className="mt-1.5"
                value={form.guests}
                onChange={(event) =>
                  patch({ guests: Number(event.target.value) || 0 })
                }
              />
            </div>
            <p className="mt-4 rounded-lg bg-secondary/60 px-3 py-2.5 text-sm">
              Pour {form.guests} invités, comptez environ{" "}
              <strong>{suggestedTableCount(form.guests)} tables</strong>, donc
              autant de centres de table.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() =>
                patch({
                  pieces: {
                    ...form.pieces,
                    "centre-table-bas": suggestedTableCount(form.guests),
                  },
                })
              }
            >
              Pré-remplir les centres de table
            </Button>
          </Step>
        ) : null}

        {step === 3 ? (
          <Step
            title="Quelles pièces florales ?"
            hint="Indiquez une quantité pour chacune."
          >
            <ul className="space-y-1.5">
              {EVENT_PIECES.map((piece) => {
                const quantity = form.pieces[piece.id] ?? 0;
                return (
                  <li
                    key={piece.id}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5",
                      quantity > 0
                        ? "border-poppy/50 bg-poppy/5"
                        : "border-border",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="text-sm">{piece.label}</p>
                      <p className="text-xs text-muted-foreground">
                        Main-d&apos;œuvre {formatEuro(piece.labour)} · environ{" "}
                        {piece.defaultStems} tiges
                      </p>
                    </div>
                    <Stepper
                      value={quantity}
                      label={piece.label}
                      onChange={(next) =>
                        patch({
                          pieces: {
                            ...form.pieces,
                            [piece.id as EventPieceId]: next,
                          },
                        })
                      }
                    />
                  </li>
                );
              })}
            </ul>
          </Step>
        ) : null}

        {step === 4 ? (
          <Step
            title="Votre palette"
            hint="Une à trois teintes, pas davantage : c'est plus lisible."
          >
            <div className="flex flex-wrap gap-2">
              {COLORS.map((color) => {
                const selected = form.palette.includes(color);
                const swatch = COLOR_SWATCHES[color];
                return (
                  <button
                    key={color}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      const next = selected
                        ? form.palette.filter((item) => item !== color)
                        : [...form.palette, color].slice(-3);
                      patch({ palette: next as Color[] });
                    }}
                    className={cn(
                      "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      selected
                        ? "border-foreground/40 bg-secondary"
                        : "border-border text-muted-foreground hover:border-foreground/30",
                    )}
                  >
                    <span
                      aria-hidden
                      className="size-4 rounded-full border"
                      style={{
                        backgroundColor: swatch.fill,
                        borderColor: swatch.stroke,
                      }}
                    />
                    {color}
                  </button>
                );
              })}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Sélection : {form.palette.join(", ") || "aucune"}
            </p>
          </Step>
        ) : null}

        {step === 5 ? (
          <Step title="Quel style ?">
            <div className="grid gap-2 sm:grid-cols-2">
              {STYLES.map((style) => (
                <ChoiceCard
                  key={style}
                  label={style}
                  selected={form.style === style}
                  onSelect={() => patch({ style: style as Style })}
                  description={STYLE_DESCRIPTIONS[style]}
                />
              ))}
            </div>
          </Step>
        ) : null}

        {step === 6 ? (
          <Step
            title="Votre budget indicatif"
            hint="Nous ajustons les variétés et les quantités pour rester dans l'enveloppe, en expliquant chaque arbitrage."
          >
            <p className="font-heading text-4xl">{formatEuro(form.budget)}</p>
            <Slider
              className="mt-5"
              min={150}
              max={12000}
              step={50}
              value={[form.budget]}
              onValueChange={(value) =>
                patch({
                  budget: Array.isArray(value) ? (value[0] ?? 150) : value,
                })
              }
              aria-label="Budget indicatif"
            />
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>150 €</span>
              <span>12 000 €</span>
            </div>
          </Step>
        ) : null}

        {step === 7 ? (
          <Step title="Des contraintes ?">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-3 py-2.5">
                <Label htmlFor="allergies" className="text-sm font-normal">
                  Une personne allergique au pollen sera présente
                </Label>
                <Switch
                  id="allergies"
                  checked={form.constraints.allergies}
                  onCheckedChange={(value) =>
                    patchConstraints({ allergies: value })
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-3 py-2.5">
                <Label htmlFor="animaux" className="text-sm font-normal">
                  Des animaux seront à proximité des compositions
                </Label>
                <Switch
                  id="animaux"
                  checked={form.constraints.pets}
                  onCheckedChange={(value) => patchConstraints({ pets: value })}
                />
              </div>

              <FlowerSelector
                label="Fleurs à exclure"
                flowers={flowers}
                selected={form.constraints.excludedFlowerIds}
                onChange={(ids) => patchConstraints({ excludedFlowerIds: ids })}
              />
              <FlowerSelector
                label="Fleurs imposées"
                flowers={flowers}
                selected={form.constraints.requiredFlowerIds}
                onChange={(ids) => patchConstraints({ requiredFlowerIds: ids })}
              />

              <div>
                <Label htmlFor="precisions" className="text-sm">
                  Autres précisions
                </Label>
                <Textarea
                  id="precisions"
                  className="mt-1.5"
                  rows={3}
                  value={form.constraints.notes}
                  placeholder="Contraintes du lieu, horaires d'installation, souhaits particuliers…"
                  onChange={(event) =>
                    patchConstraints({ notes: event.target.value })
                  }
                />
              </div>
            </div>
          </Step>
        ) : null}

        {step === 8 ? <QuoteSummary form={form} catalog={flowers} /> : null}
      </div>

      {error ? (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="mt-8 flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setError(null);
            setStep(Math.max(0, step - 1));
          }}
          disabled={step === 0}
        >
          <ArrowLeft aria-hidden /> Précédent
        </Button>
        {step < STEPS.length - 1 ? (
          <Button type="button" onClick={goNext}>
            Continuer <ArrowRight aria-hidden />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

const DESCRIPTIONS: Record<EventType, string> = {
  mariage: "Bouquet de mariée, cérémonie, tables, décor.",
  baptême: "Compositions douces, pastel, sans pollen fort.",
  anniversaire: "Une table, un décor, une atmosphère.",
  "séminaire / entreprise":
    "Compositions structurées, longue tenue, tons neutres.",
  funérailles: "Blanc, ivoire, vert. Formes sobres.",
  autre: "Dites-nous simplement ce que vous préparez.",
};

const STYLE_DESCRIPTIONS: Record<Style, string> = {
  champêtre: "Cueilli au jardin, tiges libres, beaucoup de verdure.",
  romantique: "Roses de jardin et pivoines, dégradés doux.",
  minimaliste: "Peu de variétés, un geste net.",
  luxuriant: "Volume, matières, densité maximale.",
  moderne: "Lignes graphiques, contrastes assumés.",
  pastel: "Teintes poudrées, lumière douce.",
  sauvage: "Asymétrie franche, graminées et branchages.",
};

function Step({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="heading-display flex items-start gap-2.5 text-2xl sm:text-3xl">
        <PetalMark className="mt-2.5 text-poppy" />
        {title}
      </h2>
      {hint ? (
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">{hint}</p>
      ) : null}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function ChoiceCard({
  label,
  description,
  selected,
  onSelect,
}: {
  label: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "rounded-xl border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        selected
          ? "border-poppy bg-poppy/5"
          : "border-border bg-card hover:border-foreground/25",
      )}
    >
      <span className="block font-heading text-lg capitalize">{label}</span>
      <span className="mt-1 block text-sm text-muted-foreground">
        {description}
      </span>
    </button>
  );
}

function Stepper({
  value,
  label,
  onChange,
}: {
  value: number;
  label: string;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={value === 0}
        aria-label={`Retirer une unité de ${label}`}
      >
        <Minus aria-hidden />
      </Button>
      <span
        className="min-w-8 text-center text-sm tabular-nums"
        aria-live="polite"
      >
        {value}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => onChange(Math.min(400, value + 1))}
        aria-label={`Ajouter une unité de ${label}`}
      >
        <Plus aria-hidden />
      </Button>
    </div>
  );
}

function FlowerSelector({
  label,
  flowers,
  selected,
  onChange,
}: {
  label: string;
  flowers: FlowerLite[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const matches = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("fr-FR");
    if (needle.length < 2) return [];
    return flowers
      .filter(
        (flower) =>
          !selected.includes(flower.id) &&
          flower.nameFr.toLocaleLowerCase("fr-FR").includes(needle),
      )
      .slice(0, 6);
  }, [query, flowers, selected]);

  const byId = useMemo(
    () => new Map(flowers.map((flower) => [flower.id, flower])),
    [flowers],
  );
  const inputId = `selecteur-${label.replace(/[^a-zA-Z]+/g, "-").toLowerCase()}`;

  return (
    <div>
      <Label htmlFor={inputId} className="text-sm">
        {label}
      </Label>
      <Input
        id={inputId}
        className="mt-1.5"
        value={query}
        placeholder="Tapez un nom de fleur…"
        onChange={(event) => setQuery(event.target.value)}
      />
      {matches.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {matches.map((flower) => (
            <li key={flower.id}>
              <button
                type="button"
                onClick={() => {
                  onChange([...selected, flower.id]);
                  setQuery("");
                }}
                className="w-full rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {flower.nameFr}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {selected.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {selected.map((id) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => onChange(selected.filter((item) => item !== id))}
                className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs hover:border-foreground/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {byId.get(id)?.nameFr ?? id}
                <X className="size-3" aria-hidden />
                <span className="sr-only">Retirer</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
