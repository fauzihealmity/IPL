import type { Metadata } from "next";
import "./globals.css";
import { AuthSessionProvider } from "@/components/shared/session-provider";
import { Toaster } from "@/components/shared/toaster";

export const metadata: Metadata = {
  title: "Mutiara Cahaya Residence — IPL Management System",
  description: "Sistem pengelolaan Iuran Pemeliharaan Lingkungan perumahan Mutiara Cahaya Residence.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen antialiased">
        <AuthSessionProvider>{children}</AuthSessionProvider>
        <Toaster />
      </body>
    </html>
  );
}
