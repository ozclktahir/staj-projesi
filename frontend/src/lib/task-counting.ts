/**
 * KPI / grafik sayaçlarına hangi görevlerin gireceğinin TEK kaynağı.
 *
 * Kural: bir görev yalnızca gerçekten "aktif" ise sayılır.
 *  - `parent_task_id` dolu → alt görev, üst seviyede sayılmaz
 *  - `deleted_at` dolu → silinmiş
 *  - `assignment_status = 'pending'` → atanan kişi görevi henüz KABUL ETMEDİ
 *    (sahiplenme onayı bekliyor); onay beklerken sayaç artmamalı
 *  - `assignment_status = 'rejected'` → reddedilmiş / arşivlenmiş
 *
 * Sunucu tarafındaki iki ayrı sayaç (`analytics.ts` ve `getDashboardTaskStats`)
 * bu fonksiyonu paylaşır; mobil tarafta aynı kural
 * `dashboard_models.dart` içinde uygulanır.
 */
export type CountableTaskRow = {
  parent_task_id?: unknown;
  deleted_at?: unknown;
  assignment_status?: unknown;
};

export function isCountableTask(row: CountableTaskRow): boolean {
  if (row.parent_task_id) return false;
  if (row.deleted_at) return false;

  const assignment =
    typeof row.assignment_status === "string"
      ? row.assignment_status.trim().toLowerCase()
      : null;

  return assignment !== "pending" && assignment !== "rejected";
}
