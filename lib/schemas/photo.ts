import { z } from "zod";

/**
 * Médias Pexels.
 *
 * Les photos ne sont pas récupérées à l'exécution : `npm run photos:fetch`
 * interroge l'API une fois et écrit data/photos.json, versionné. Le site ne
 * dépend donc jamais de la disponibilité de Pexels ni de la clé API, et deux
 * visiteurs voient exactement la même photo pour une fleur donnée.
 */

const pexelsImage = z.string().regex(/^https:\/\/images\.pexels\.com\//, "Hôte Pexels attendu.");
const pexelsVideo = z.string().regex(/^https:\/\/videos\.pexels\.com\//, "Hôte Pexels attendu.");
const pexelsPage = z.string().regex(/^https:\/\/www\.pexels\.com\//, "Hôte Pexels attendu.");

const credit = {
  photographer: z.string().min(1).max(120),
  photographerUrl: pexelsPage,
  pageUrl: pexelsPage,
};

export const photoSchema = z.object({
  pexelsId: z.number().int().positive(),
  /** URL d'origine, sans paramètre : les tailles sont dérivées à l'affichage. */
  src: pexelsImage,
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  /** Description fournie par Pexels, reprise telle quelle en `alt` de secours. */
  alt: z.string().max(300),
  /** Couleur moyenne, utilisée comme fond pendant le chargement. */
  avgColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  ...credit,
});

export type Photo = z.infer<typeof photoSchema>;

export const videoSchema = z.object({
  pexelsId: z.number().int().positive(),
  /** Fichier .mp4 servi directement. */
  src: pexelsVideo,
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  durationSeconds: z.number().positive(),
  /** Image fixe affichée avant lecture et en cas de mouvement réduit. */
  poster: pexelsImage,
  ...credit,
});

export type Video = z.infer<typeof videoSchema>;

/** Photo attribuée à une fleur, avec la requête qui l'a trouvée. */
export const flowerPhotoSchema = photoSchema.extend({
  /** Requête Pexels employée, conservée pour pouvoir auditer un mauvais choix. */
  query: z.string().min(1).max(80),
});

export type FlowerPhoto = z.infer<typeof flowerPhotoSchema>;

export const mediaLibrarySchema = z
  .object({
    /** Horodatage de la dernière récupération, en ISO 8601. */
    fetchedAt: z.iso.datetime(),
    /** Une entrée par identifiant de fleur. */
    flowers: z.record(z.string(), flowerPhotoSchema),
    home: z.object({
      /** Plans du montage d'ouverture, joués dans l'ordre. */
      hero: z.array(videoSchema).min(2).max(6),
      /** Vidéos glissées dans le mur d'images. */
      videos: z.array(videoSchema).min(1).max(6),
      photos: z.array(photoSchema).min(1).max(24),
    }),
  })
  .strict()
  .superRefine((library, ctx) => {
    const seen = new Set<number>();
    for (const [id, photo] of Object.entries(library.flowers)) {
      if (seen.has(photo.pexelsId)) {
        ctx.addIssue({
          code: "custom",
          path: ["flowers", id],
          message: `Photo réutilisée par deux fleurs : ${photo.pexelsId}`,
        });
      }
      seen.add(photo.pexelsId);
    }
  });

export type MediaLibrary = z.infer<typeof mediaLibrarySchema>;
