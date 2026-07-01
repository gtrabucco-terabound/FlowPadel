import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "FlowPadel — Jugá, competí y seguí tu ranking",
  description:
    "Inscribite a torneos y canchas abiertas de pádel, seguí los resultados en vivo y tu ranking.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          // Anti-FOUC: aplica el tema guardado antes del primer render.
          // Default = oscuro (sin atributo). Claro => data-theme="light".
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('flowpadel-theme');if(t==='light'){document.documentElement.setAttribute('data-theme','light');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
