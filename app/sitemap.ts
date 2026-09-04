import type { MetadataRoute } from "next";

import { getAllFlowers } from "@/lib/flowers";
import { SHOP } from "@/lib/shop";

const STATIC_ROUTES = [
  { path: "/", priority: 1 },
  { path: "/catalogue", priority: 0.9 },
  { path: "/composer", priority: 0.9 },
  { path: "/devis", priority: 0.9 },
  { path: "/boutique", priority: 0.8 },
  { path: "/evenements", priority: 0.8 },
  { path: "/a-propos", priority: 0.5 },
  { path: "/contact", priority: 0.6 },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    ...STATIC_ROUTES.map((route) => ({
      url: `${SHOP.siteUrl}${route.path}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: route.priority,
    })),
    ...getAllFlowers().map((flower) => ({
      url: `${SHOP.siteUrl}/catalogue/${flower.id}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.4,
    })),
  ];
}
