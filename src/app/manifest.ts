import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Worlds 2026 Live",
    short_name: "Worlds 2026",
    description: "Live schedule, results and recaps for the 2026 League of Legends World Championship. Fan-made.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0a10",
    theme_color: "#0b0a10",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
