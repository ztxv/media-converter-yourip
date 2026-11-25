import type { Metadata, Viewport } from "next";
import "./globals.css";
import { IS_DEMO } from "@/lib/demo";

// Public address of the hosted demo. Relative metadata URLs (icons, images, og:url) resolve against it.
const SITE_URL = "https://yt-media-converter.vercel.app";

const title = IS_DEMO ? "YouRip — Live demo (simulated)" : "YouRip — Local MP3 & MP4 converter";
const description = IS_DEMO
  ? "A simulated demo of YouRip. Nothing is downloaded or converted. Run it locally to save your own media."
  : "Save your own YouTube media locally as MP3 audio or MP4 video.";
const imageAlt = IS_DEMO
  ? "YouRip live demo: simulated, nothing is downloaded or converted"
  : "YouRip: local MP3 and MP4 converter";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title,
  description,
  // /favicon.ico comes from src/app/favicon.ico (Next adds its tag); the SVG and Apple icon are declared here.
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    siteName: "YouRip",
    url: "/",
    title,
    description,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: imageAlt }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [{ url: "/og-image.png", alt: imageAlt }],
  },
  // The hosted demo must not be indexed.
  ...(IS_DEMO ? { robots: { index: false, follow: false } } : {}),
};

export const viewport: Viewport = {
  themeColor: "#101012",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="antialiased"
      >
        {children}
      </body>
    </html>
  );
}
