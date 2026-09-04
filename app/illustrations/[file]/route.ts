import { flowerSvgMarkup } from "@/lib/flower-art";
import { getFlowerById } from "@/lib/flowers";

/**
 * Sert l'illustration SVG d'une fleur à l'adresse déclarée dans `imageUrl`
 * (/illustrations/rose-avalanche.svg). Le dessin est généré à la volée à
 * partir du catalogue : aucune image n'est stockée, aucune ne peut être
 * cassée. Utilisé pour les aperçus sociaux et le JSON-LD.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
): Promise<Response> {
  const { file } = await params;
  if (!file.endsWith(".svg")) {
    return new Response("Illustration introuvable.", { status: 404 });
  }

  const id = file.slice(0, -".svg".length);
  const flower = getFlowerById(id);
  if (!flower) {
    return new Response("Illustration introuvable.", { status: 404 });
  }

  return new Response(flowerSvgMarkup(flower, `${flower.nameFr} — illustration`), {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}

export function generateStaticParams(): { file: string }[] {
  return [];
}
