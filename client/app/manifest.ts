import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Zenvy Manager",
    short_name: "Zenvy",
    description: "Manage football field bookings and daily availability.",
    start_url: "/manager",
    display: "standalone",
    background_color: "#fcfaf6",
    theme_color: "#5363f1",
    orientation: "portrait",
    icons: [
      { src: "/zenvy-football-logo.png", sizes: "192x192", type: "image/png" },
      { src: "/zenvy-football-logo.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
