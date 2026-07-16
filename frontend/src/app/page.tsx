export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-8 text-foreground">
      <h1 className="text-3xl font-semibold tracking-tight">
        Frontend Çalışıyor
      </h1>
      <p className="rounded-[var(--radius)] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
        Turuncu-Siyah tema aktif
      </p>
    </main>
  );
}
