import { z } from "zod";
import { translate, type Locale } from "@/i18n/config";

type TFn = (key: string) => string;

function tFor(locale: Locale): TFn {
  return (key) => translate(locale, key);
}

export function createLoginSchema(locale: Locale = "tr") {
  const t = tFor(locale);
  return z.object({
    email: z
      .string()
      .trim()
      .min(1, t("auth.emailRequired"))
      .transform((v) => v.toLowerCase())
      .pipe(z.email(t("auth.emailInvalid"))),
    password: z
      .string()
      .min(1, t("auth.passwordRequired"))
      .min(6, t("auth.passwordMin")),
  });
}

export function createRegisterSchema(locale: Locale = "tr") {
  const t = tFor(locale);
  return z.object({
    firstName: z.string().trim().min(1, t("auth.firstNameRequired")),
    lastName: z.string().trim().min(1, t("auth.lastNameRequired")),
    email: z
      .string()
      .trim()
      .min(1, t("auth.emailRequired"))
      .transform((v) => v.toLowerCase())
      .pipe(z.email(t("auth.emailInvalid"))),
    password: z.string().min(6, t("auth.passwordMin")),
  });
}

/** @deprecated — use createLoginSchema(locale) */
export const loginSchema = createLoginSchema("tr");
/** @deprecated — use createRegisterSchema(locale) */
export const registerSchema = createRegisterSchema("tr");

export type LoginFormValues = z.infer<ReturnType<typeof createLoginSchema>>;
export type RegisterFormValues = z.infer<
  ReturnType<typeof createRegisterSchema>
>;

/** Axios / Nest hata mesajını kullanıcı dostu metne çevirir. */
export function formatAuthApiError(
  message: unknown,
  fallback: string,
  locale: Locale = "tr",
): string {
  const t = tFor(locale);
  const raw = Array.isArray(message)
    ? message.join(", ")
    : String(message ?? fallback);

  const lower = raw.toLowerCase();

  if (lower.includes("rate limit") || lower.includes("çok fazla")) {
    return locale === "en"
      ? "Too many attempts. Please wait a few minutes and try again."
      : "Çok fazla deneme yapıldı. Lütfen birkaç dakika bekleyin.";
  }

  if (lower.includes("invalid") && lower.includes("email")) {
    return locale === "en"
      ? "Invalid email address. Use a real address (e.g. you@gmail.com)."
      : "E-posta geçersiz. Gerçek bir adres kullanın (ör. adiniz@gmail.com).";
  }

  if (lower.includes("invalid login") || lower.includes("invalid credentials")) {
    return t("auth.badCredentials");
  }

  return raw || fallback;
}
