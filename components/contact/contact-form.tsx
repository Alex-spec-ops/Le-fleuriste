"use client";

import { useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SHOP } from "@/lib/shop";

const schema = z.object({
  name: z.string().trim().min(2, "Indiquez votre nom."),
  email: z.email("Adresse e-mail invalide."),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+ ().-]*$/, "Numéro de téléphone invalide.")
    .optional()
    .or(z.literal("")),
  subject: z.string().trim().min(2, "Précisez l'objet de votre message."),
  message: z.string().trim().min(10, "Détaillez un peu votre demande."),
});

type Values = z.infer<typeof schema>;

const EMPTY: Values = { name: "", email: "", phone: "", subject: "", message: "" };

export function ContactForm() {
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>({});
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  const set = (key: keyof Values, value: string) =>
    setValues((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const next: Partial<Record<keyof Values, string>> = {};
      for (const issue of parsed.error.issues) {
        next[issue.path[0] as keyof Values] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setState("sending");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!response.ok) throw new Error("envoi impossible");
      setState("sent");
      setValues(EMPTY);
    } catch {
      setState("failed");
    }
  };

  if (state === "sent") {
    return (
      <div className="rounded-xl border border-sage/50 bg-sage-soft p-6">
        <p className="flex items-center gap-2 font-heading text-lg">
          <CheckCircle2 className="size-5 text-sage" aria-hidden />
          Message reçu
        </p>
        <p className="mt-2 text-sm">
          Nous vous répondons sous deux jours ouvrés. Pour une demande urgente, appelez-nous au{" "}
          {SHOP.phoneDisplay}.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => setState("idle")}
        >
          Écrire un autre message
        </Button>
      </div>
    );
  }

  const mailto = `mailto:${SHOP.email}?subject=${encodeURIComponent(values.subject || "Demande depuis le site")}&body=${encodeURIComponent(values.message)}`;

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="contact-nom"
          label="Votre nom"
          value={values.name}
          error={errors.name}
          onChange={(value) => set("name", value)}
          autoComplete="name"
        />
        <Field
          id="contact-email"
          label="Votre e-mail"
          type="email"
          value={values.email}
          error={errors.email}
          onChange={(value) => set("email", value)}
          autoComplete="email"
        />
        <Field
          id="contact-tel"
          label="Téléphone (facultatif)"
          type="tel"
          value={values.phone ?? ""}
          error={errors.phone}
          onChange={(value) => set("phone", value)}
          autoComplete="tel"
        />
        <Field
          id="contact-objet"
          label="Objet"
          value={values.subject}
          error={errors.subject}
          onChange={(value) => set("subject", value)}
        />
      </div>

      <div>
        <Label htmlFor="contact-message" className="text-sm">
          Votre message
        </Label>
        <Textarea
          id="contact-message"
          rows={5}
          className="mt-1.5"
          value={values.message}
          aria-invalid={errors.message ? true : undefined}
          aria-describedby={errors.message ? "contact-message-erreur" : undefined}
          onChange={(event) => set("message", event.target.value)}
        />
        {errors.message ? (
          <p id="contact-message-erreur" className="mt-1 text-xs text-destructive">
            {errors.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={state === "sending"}>
          <Send aria-hidden /> {state === "sending" ? "Envoi…" : "Envoyer"}
        </Button>
        <Button type="button" variant="ghost" render={<a href={mailto} />}>
          Ouvrir dans ma messagerie
        </Button>
      </div>

      {state === "failed" ? (
        <p role="alert" className="text-sm text-destructive">
          L&apos;envoi a échoué. Écrivez-nous directement à {SHOP.email} ou appelez le{" "}
          {SHOP.phoneDisplay}.
        </p>
      ) : null}
    </form>
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
