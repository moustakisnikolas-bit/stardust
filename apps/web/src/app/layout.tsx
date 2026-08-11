import type { Metadata } from "next";
import { AuthProvider } from "@/lib/AuthProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stardust",
  description: "Astrologically matched connections",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
