import type { Metadata } from "next";
import { ViewTransition } from "react";
import {
  Playfair_Display,
  Source_Serif_4,
  DM_Sans,
  JetBrains_Mono, Geist } from "next/font/google";
import "./globals.css";
import { AuthShell } from "./components/auth-shell";
import { Navbar } from "./components/navbar";
import { cn } from "@/lib/utils";

const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "700"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400"],
});

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Wanderlust — Dream Destinations",
  description:
    "Describe your travel vibe and let AI agents find your perfect destination with a custom travel poster, itinerary, and cultural tips.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", playfair.variable, sourceSerif.variable, jetbrainsMono.variable, "font-sans", geist.variable)}
    >
      <body className="min-h-full overflow-x-hidden">
        <AuthShell>
          <Navbar />
          <ViewTransition enter="crossfade" exit="crossfade" default="crossfade">
            {children}
          </ViewTransition>
        </AuthShell>
      </body>
    </html>
  );
}
