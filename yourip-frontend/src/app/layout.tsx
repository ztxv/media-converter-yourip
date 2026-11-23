import type { Metadata } from "next";
import "./globals.css";
import { IS_DEMO } from "@/lib/demo";

export const metadata: Metadata = IS_DEMO
  ? {
      title: "YouRip — Live demo (simulated)",
      description: "A simulated demo of YouRip. Nothing is downloaded or converted. Run it locally to save your own media.",
      robots: { index: false, follow: false },
    }
  : {
      title: "YouRip — Local MP3 & MP4 converter",
      description: "Save your own YouTube media locally as MP3 audio or MP4 video.",
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
