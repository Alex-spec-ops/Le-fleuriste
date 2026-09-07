import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    /**
     * Les photos viennent du CDN Pexels, qui redimensionne lui-même. Le
     * chargeur maison lui passe la largeur demandée au lieu de faire transiter
     * chaque image par l'optimiseur de Next. Voir lib/pexels-loader.ts.
     */
    loaderFile: "./lib/pexels-loader.ts",
  },
};

export default nextConfig;
