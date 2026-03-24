import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Connectaflow",
  description: "Signal-led GTM command center for account prioritization, messaging, execution, and outcomes.",
  icons: {
    icon: "/logo.jpg",
    shortcut: "/logo.jpg",
    apple: "/logo.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased" suppressHydrationWarning>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#FFFFFF',
              border: '1px solid #E6EAE8',
              color: '#1A1A1A',
              fontSize: '13px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            },
          }}
          richColors
        />
      </body>
    </html>
  );
}
