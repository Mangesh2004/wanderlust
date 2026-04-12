import type { Metadata } from "next";
import {
  Playfair_Display,
  Source_Serif_4,
  DM_Sans,
  JetBrains_Mono, Geist } from "next/font/google";
import "./globals.css";
import { createSupabaseServer } from "@/lib/supabase/server";
import { AuthProvider } from "./components/auth-provider";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", playfair.variable, sourceSerif.variable, jetbrainsMono.variable, "font-sans", geist.variable)}
    >
      <body className="min-h-full overflow-x-hidden">
        <AuthProvider initialUser={user}>
          <Navbar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
