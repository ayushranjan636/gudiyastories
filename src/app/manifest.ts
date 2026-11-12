import type { MetadataRoute } from "next";
import { SITE } from "@/config/site";

/** Web app manifest: name, colours and icon for "Add to home screen" and browsers. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.name,
    short_name: SITE.name,
    description: "Value-based picture books and mindful mandala colouring books by S.V. Bharathi, delivered across India.",
    start_url: "/",
    display: "browser",
    background_color: "#FBF8F1",
    theme_color: "#FBF8F1",
    lang: "en-IN",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
