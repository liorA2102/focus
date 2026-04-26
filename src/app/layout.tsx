import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { LanguageProvider } from "@/context/LanguageContext";

export const metadata: Metadata = {
  title: "Focus — Jacob's Desk",
  description: "Recruiting made simple",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LanguageProvider>
          <div style={{ display: "flex", minHeight: "100vh" }}>
            <Sidebar />
            <main
              style={{
                flex: 1,
                padding: "44px 52px",
                overflowY: "auto",
                minHeight: "100vh",
              }}
            >
              {children}
            </main>
          </div>
        </LanguageProvider>
      </body>
    </html>
  );
}
