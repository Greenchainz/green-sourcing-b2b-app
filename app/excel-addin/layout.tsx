import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "GreenChainz | Excel Audit Add-in",
    description: "Carbon audit for your Bill of Materials directly in Excel",
    viewport: "width=device-width, initial-scale=1",
};

export default function ExcelAddinLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <head>
                {/* Office.js Library - Required for Excel interaction */}
                <script src="https://appsforoffice.microsoft.com/lib/1/hosted/office.js" />
            </head>
            <body className="font-sans bg-white">
                {/* Excel Add-in runs in a constrained iframe - minimal wrapper */}
                <div className="w-full h-screen overflow-auto">
                    {children}
                </div>
            </body>
        </html>
    );
}
