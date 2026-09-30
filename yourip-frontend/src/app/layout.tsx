import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
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
