"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { EMPTY_QUOTE_FORM, type QuoteContact, type QuoteForm } from "@/lib/schemas/quote";

/**
 * Devis en cours, conservé dans le navigateur : le client peut fermer l'onglet
 * et reprendre plus tard là où il s'était arrêté.
 */

const EMPTY_CONTACT: QuoteContact = { name: "", email: "", phone: "", message: "" };

type QuoteStore = {
  form: QuoteForm;
  contact: QuoteContact;
  step: number;
  /** Référence attribuée lors de l'envoi, conservée pour l'affichage. */
  sentReference: string | null;
  patch: (patch: Partial<QuoteForm>) => void;
  patchConstraints: (patch: Partial<QuoteForm["constraints"]>) => void;
  patchContact: (patch: Partial<QuoteContact>) => void;
  setStep: (step: number) => void;
  setSentReference: (reference: string | null) => void;
  reset: () => void;
};

export const useQuoteStore = create<QuoteStore>()(
  persist(
    (set) => ({
      form: EMPTY_QUOTE_FORM,
      contact: EMPTY_CONTACT,
      step: 0,
      sentReference: null,

      patch: (patch) => set((state) => ({ form: { ...state.form, ...patch } })),
      patchConstraints: (patch) =>
        set((state) => ({
          form: { ...state.form, constraints: { ...state.form.constraints, ...patch } },
        })),
      patchContact: (patch) => set((state) => ({ contact: { ...state.contact, ...patch } })),
      setStep: (step) => set({ step }),
      setSentReference: (sentReference) => set({ sentReference }),
      reset: () =>
        set({ form: EMPTY_QUOTE_FORM, contact: EMPTY_CONTACT, step: 0, sentReference: null }),
    }),
    {
      name: "lefleuriste:devis",
      version: 1,
      partialize: (state) => ({
        form: state.form,
        contact: state.contact,
        step: state.step,
        sentReference: state.sentReference,
      }),
    },
  ),
);
