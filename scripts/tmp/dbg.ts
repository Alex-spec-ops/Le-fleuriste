import { EMPTY_QUOTE_FORM, quoteFormSchema } from "../../lib/schemas/quote";
const form = {
  ...EMPTY_QUOTE_FORM,
  date: "2026-06-13",
  location: "Paris",
  guests: 80,
  pieces: { "bouquet-mariee": 1, "centre-table-bas": 10, boutonniere: 6 },
  palette: ["blanc", "rose pâle"],
  style: "romantique",
  budget: 2000,
};
const r = quoteFormSchema.safeParse(form);
console.log(r.success ? "ok" : JSON.stringify(r.error.issues, null, 1));
