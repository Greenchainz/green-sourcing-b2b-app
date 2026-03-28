import type { Metadata } from "next";
import { AppProviders } from "./providers";
import { LayoutContent } from "./LayoutContent";
import "./globals.css";

export const metadata: Metadata = {
  title: "GreenChainz - Verified Sustainable Sourcing",
  description: "The global trust layer for sustainable commerce",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <AppProviders>
          <LayoutContent>
            {children}
          </LayoutContent>
        </AppProviders>
      </body>
    </html>
  );
}
