import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Focus — Jacob's Desk",
  description: "Recruiting made simple",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div style={{ display: "flex", minHeight: "100vh" }}>
          <Sidebar />
          <main
            style={{
              flex: 1,
              padding: "40px 48px",
              overflowY: "auto",
            }}
          >
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
