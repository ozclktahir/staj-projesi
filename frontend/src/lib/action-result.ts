/** Server Action sonuç tipleri ve hata yardımcıları */

export type ActionFailure = { success: false; error: string };

export function toPlainErrorMessage(
  error: unknown,
  fallback = "Beklenmeyen bir hata oluştu.",
): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  if (typeof error === "string" && error.trim()) {
    return error;
  }
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    const msg = (error as { message: string }).message.trim();
    if (msg) return msg;
  }
  return fallback;
}

/** console.error yazar ve frontend'e uygun düz hata mesajı döner */
export function logActionError(
  scope: string,
  error: unknown,
  fallback: string,
): string {
  console.error(`[${scope}]`, error);
  return toPlainErrorMessage(error, fallback);
}
