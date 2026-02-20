import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Altadena Morning Digest – Eaton Fire & Community News",
  description:
    "Daily morning news digest covering the Eaton Fire, recovery efforts, and community news in Altadena, California.",
  openGraph: {
    title: "Altadena Morning Digest",
    description:
      "Daily news digest covering the Eaton Fire and Altadena community.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
