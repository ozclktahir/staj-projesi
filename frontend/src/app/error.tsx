"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h2 className="text-lg font-semibold text-foreground">
        Bir şeyler ters gitti
      </h2>
      <p className="max-w-md text-sm text-muted-foreground">
        {error.message || "Beklenmeyen bir hata oluştu."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-[var(--radius)] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Tekrar dene
      </button>
      <a href="/login" className="text-sm text-primary underline">
        Giriş sayfasına dön
      </a>
    </div>
  );
}
