import type { Metadata } from "next";
import { AuthProvider } from "@/lib/AuthProvider";
import { Starfield } from "@/components/effects/Starfield";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stardust",
  description: "Astrologically matched connections",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Starfield />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
