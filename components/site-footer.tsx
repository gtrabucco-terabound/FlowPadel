import { Logo } from "@/components/logo";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border-soft bg-surface">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-4 py-8 text-center text-sm text-muted">
        <Logo />
        <p>Gestión de torneos y ranking de pádel.</p>
        <p className="text-xs text-muted/70">
          © {new Date().getFullYear()} FlowPadel
        </p>
      </div>
    </footer>
  );
}
