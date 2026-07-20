import { z } from "zod";

const emailField = z
  .string()
  .trim()
  .min(1, "E-posta zorunludur")
  .transform((v) => v.toLowerCase())
  .pipe(z.email("Geçerli bir e-posta adresi girin"));

export const loginSchema = z.object({
  email: emailField,
  password: z
    .string()
    .min(1, "Şifre zorunludur")
    .min(6, "Şifre en az 6 karakter olmalıdır"),
});

export const registerSchema = z.object({
  firstName: z.string().trim().min(1, "Ad zorunludur"),
  lastName: z.string().trim().min(1, "Soyad zorunludur"),
  email: emailField,
  password: z.string().min(6, "Şifre en az 6 karakter olmalıdır"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;

/** Axios / Nest hata mesajını kullanıcı dostu metne çevirir. */
export function formatAuthApiError(
  message: unknown,
  fallback: string,
): string {
  const raw = Array.isArray(message)
    ? message.join(", ")
    : String(message ?? fallback);

  const lower = raw.toLowerCase();

  if (lower.includes("rate limit") || lower.includes("çok fazla")) {
    return (
      "Çok fazla deneme yapıldı (e-posta limiti). Lütfen 2–5 dakika bekleyin. " +
      "Geliştirme için: Supabase → Authentication → Providers → Email → Confirm email kapalı olsun."
    );
  }

  if (lower.includes("invalid") && lower.includes("email")) {
    return (
      "E-posta geçersiz. Gerçek bir adres kullanın (ör. adiniz@gmail.com). " +
      "@test.com / @email.com gibi sahte alan adları reddedilebilir."
    );
  }

  if (lower.includes("invalid login") || lower.includes("invalid credentials")) {
    return "E-posta veya şifre hatalı.";
  }

  return raw || fallback;
}
