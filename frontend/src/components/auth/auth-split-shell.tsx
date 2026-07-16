import type { ReactNode } from "react";

type AuthSplitShellProps = {
  children: ReactNode;
  eyebrow?: string;
  title: string;
  subtitle: string;
};

export function AuthSplitShell({
  children,
  eyebrow = "staj-projesi",
  title,
  subtitle,
}: AuthSplitShellProps) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-black text-white lg:flex lg:flex-col lg:justify-center lg:px-16 lg:py-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(circle at 20% 20%, hsl(38 92% 50% / 0.45), transparent 45%), radial-gradient(circle at 80% 80%, hsl(38 92% 50% / 0.2), transparent 40%)",
          }}
        />
        <div className="relative z-10 max-w-md space-y-6">
          <p className="text-sm font-medium tracking-[0.2em] text-primary uppercase">
            {eyebrow}
          </p>
          <h1 className="text-4xl leading-tight font-semibold tracking-tight xl:text-5xl">
            {title}
          </h1>
          <p className="text-base leading-relaxed text-white/70">{subtitle}</p>
          <div className="h-1 w-20 rounded-[var(--radius)] bg-primary" />
        </div>
      </aside>

      <section className="flex items-center justify-center bg-background px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">{children}</div>
      </section>
    </div>
  );
}
