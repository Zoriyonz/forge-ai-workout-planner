import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Forge: a workout plan built around your body, goals and gear",
  description:
    "Enter your measurements, goals and equipment. Forge builds a weekly plan that only uses what you actually have, and tracks your progress privately in your browser.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-glow">{children}</body>
    </html>
  );
}
