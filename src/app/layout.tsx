import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { Providers } from "./providers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Suivi des Navires — DSM",
  description: "Suivi des navires et des opérations portuaires",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);
  return (
    <html lang="fr">
      <body
        className={`${inter.variable} antialiased flex`}
        style={{ fontFamily: "var(--font-inter), sans-serif" }}
      >
        <Providers>
          {session ? (
            <>
              <Sidebar />
              <div className="flex-1 ml-72 min-h-screen bg-[#f1f5f9]">
                {children}
              </div>
            </>
          ) : (
            <div className="flex-1 min-h-screen bg-[#f1f5f9]">
              {children}
            </div>
          )}
        </Providers>
      </body>
    </html>
  );
}

