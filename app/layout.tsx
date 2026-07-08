import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "FlowPadel — Jugá, competí y seguí tu ranking",
  description:
    "Inscribite a torneos y canchas abiertas de pádel, seguí los resultados en vivo y tu ranking.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // El panel /admin tiene su propio header (gestión); ocultamos el público
  // para que no se vean dos capas encimadas.
  const pathname = (await headers()).get("x-pathname") ?? "";
  const isAdmin = pathname.startsWith("/admin");

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
        {!isAdmin && <SiteHeader />}
        <main className="flex-1">{children}</main>
        {!isAdmin && <SiteFooter />}
      </body>
    </html>
  );
}
