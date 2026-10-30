import type { Metadata } from "next";
import { Space_Mono } from "next/font/google";
import "./globals.css";
import "./neo.css";

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SubKiller",
  description: "The Honest Sub — a receipt you didn't ask for",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className={`${spaceMono.className} min-h-full bg-paper text-ink`}>{children}</body>
    </html>
  );
}
