import type { ReactNode } from "react";

type AuthSplitShellProps = {
  children: ReactNode;
};

export function AuthSplitShell({ children }: AuthSplitShellProps) {
  return (
    <div className="grid min-h-screen grid-cols-1 bg-background md:grid-cols-2">
      <aside className="relative flex min-h-[220px] items-center justify-center overflow-hidden bg-zinc-950 px-8 py-12 text-center text-zinc-50 md:min-h-screen">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, hsl(24 100% 50% / 0.35), transparent 50%), radial-gradient(circle at 70% 70%, hsl(24 100% 50% / 0.15), transparent 45%)",
          }}
        />
        <div className="relative z-10 flex flex-col items-center justify-center gap-4">
          <p className="text-sm font-medium tracking-[0.25em] text-primary uppercase">
            staj-projesi
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-50 md:text-5xl">
            Task <span className="text-primary">Management</span>
          </h1>
          <p className="max-w-sm text-sm leading-relaxed text-zinc-300 md:text-base">
            Ekiplerin için net, hızlı ve odaklı görev yönetimi.
          </p>
          <div className="mt-2 h-1 w-16 rounded-[var(--radius)] bg-primary" />
        </div>
      </aside>

      <section className="flex items-center justify-center bg-background px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">{children}</div>
      </section>
    </div>
  );
}
