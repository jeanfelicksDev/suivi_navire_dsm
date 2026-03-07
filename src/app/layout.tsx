import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Suivi des Navires — DSM",
  description: "Suivi des navires et des opérations portuaires",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${inter.variable} antialiased flex`}
        style={{ fontFamily: "var(--font-inter), sans-serif" }}
      >
        <Sidebar />
        <div className="flex-1 ml-72 min-h-screen bg-[#f1f5f9]">
          {children}
        </div>
      </body>
    </html>
  );
}

