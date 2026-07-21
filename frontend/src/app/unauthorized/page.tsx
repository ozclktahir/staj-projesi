import { redirect } from "next/navigation";

/**
 * Eski davet-zorunlu engel sayfası.
 * Artık kullanıcılar kendi workspace'lerini oluşturabilir → onboarding.
 */
export default function UnauthorizedPage() {
  redirect("/onboarding");
}
