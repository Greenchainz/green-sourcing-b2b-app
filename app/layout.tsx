import React from "react";
import Footer from "./components/Footer";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        {/* Your existing header/nav components */}

        <main className="flex-1">{children}</main>

        <Footer />
      </body>
    </html>
  );
}
