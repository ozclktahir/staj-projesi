/**
 * Komut paleti (Cmd/Ctrl+K) → sayfa eylemi köprüsü.
 *
 * Komut paleti her sayfadan açılabilir ama "yeni görev oluştur", "üye
 * davet et" gibi eylemlerin modalları o eylemi barındıran bileşenlerin
 * (CreateTaskModal, sidebar'daki Invite/CreateWorkspace modalları) yerel
 * state'inde yaşıyor — global bir modal yöneticisi yok. Bunu değiştirmek
 * yerine (geniş bir refactor gerektirir) URL'i durum taşıyıcı olarak
 * kullanıyoruz: palet hedef sayfaya `?cmd=...` ile gider, ilgili bileşen
 * mount olduğunda bu parametreyi okuyup kendi modalını açar ve parametreyi
 * temizler.
 */
export const COMMAND_PARAM = "cmd";

export const COMMAND_CREATE_TASK = "create-task";
export const COMMAND_CREATE_WORKSPACE = "create-workspace";
export const COMMAND_INVITE_MEMBER = "invite-member";

/** Mevcut path + query'ye `cmd` parametresini ekler (diğer parametreleri korur). */
export function withCommandParam(
  pathAndQuery: string,
  command: string,
): string {
  const [path, existing] = pathAndQuery.split("?");
  const params = new URLSearchParams(existing ?? "");
  params.set(COMMAND_PARAM, command);
  return `${path}?${params.toString()}`;
}
