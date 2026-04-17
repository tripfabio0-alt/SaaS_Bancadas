import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "Industrial Bench SaaS",
  description: "Advanced monitoring dashboard for industrial test benches",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background-deep text-foreground min-h-screen">
        <Sidebar />
        <Header />
        <main className="pl-64 pt-24 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
