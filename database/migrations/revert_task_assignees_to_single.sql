-- ============================================================================
-- Çoklu görev ataması (task_assignees) özelliğinin geri alınması
-- Tarih: 22 Ağustos 2026 — kullanıcı talebiyle
--
-- Uygulama artık (web + mobil + backend) task_assignees tablosuna hiç
-- yazmıyor/okumuyor — görev ataması yeniden tekli assignee_id/assigned_to
-- modeline döndü. Bu dosya, o değişikliğin veri tarafını ele alır.
--
-- BİLİNÇLİ KARAR — bu migration NE YAPMAZ:
--   - task_assignees tablosunu DROP ETMEZ.
--   - add_task_assignees_multi.sql / fix_tasks_task_assignees_rls_recursion.sql
--     migration'larının eklediği RLS politikalarını veya SECURITY DEFINER
--     fonksiyonlarını (is_task_assignee, can_view_task) KALDIRMAZ.
--   Neden: tasks tablosunun SELECT RLS politikası (tasks_select_assignee_or_admin)
--   görünürlük kontrolü için can_view_task()/is_task_assignee() fonksiyonlarını
--   kullanıyor. Bu fonksiyonlar sorgulanan task_assignees tablosu (aşağıdaki
--   ADIM 2'den sonra) hep boş olacağı için pratikte hep FALSE dönecek — yani
--   zaten etkisiz, zararsız bir dead code haline gelecek. Bu politikaları/
--   fonksiyonları da kaldırmak ekstra bir DDL riski (olası recursion hatasının
--   -bkz. fix_tasks_task_assignees_rls_recursion.sql- yanlış geri alınması)
--   taşıyor ve hiçbir fonksiyonel fayda sağlamıyor. Gelecekte gerçekten temiz
--   bir şema isteniyorsa ayrı, dikkatli bir oturumda ele alınmalı.
--
-- ============================================================================


-- ============================================================================
-- ADIM 0 — ÖNCE BUNU ÇALIŞTIRIN (salt-okunur, hiçbir şeyi değiştirmez)
-- ============================================================================
-- Bu sorgu, aşağıdaki ADIM 2'nin (silme) kaç satırı etkileyeceğini gösterir.
-- "extra_rows" > 0 ise, bu kişiler ADIM 2 çalıştırıldığında görevin
-- task_assignees kaydından kalıcı olarak silinecek (assignee_id/assigned_to
-- ile eşleşen birincil atama ETKİLENMEZ, yalnızca ONA EK olan kayıtlar gider).
SELECT
  count(*) FILTER (
    WHERE ta.user_id IS DISTINCT FROM COALESCE(t.assignee_id, t.assigned_to)
  ) AS extra_rows_to_be_deleted,
  count(*) AS total_task_assignees_rows,
  count(DISTINCT ta.task_id) FILTER (
    WHERE ta.user_id IS DISTINCT FROM COALESCE(t.assignee_id, t.assigned_to)
  ) AS affected_tasks
FROM public.task_assignees ta
JOIN public.tasks t ON t.id = ta.task_id;


-- ============================================================================
-- ADIM 1 (opsiyonel, tavsiye edilir) — silinecek satırları yedekle
-- ============================================================================
-- ADIM 2'yi çalıştırmadan önce, geri dönüşü olmayan silme için bir yedek
-- tablo oluşturur. Bir şey ters giderse buradan geri okunabilir (elle,
-- INSERT ile) — ama task_assignees'e otomatik geri yazan bir "rollback"
-- script'i YOKTUR, uygulama zaten bu tabloyu kullanmıyor.
CREATE TABLE IF NOT EXISTS public._task_assignees_backup_20260822 AS
SELECT ta.*
FROM public.task_assignees ta
JOIN public.tasks t ON t.id = ta.task_id
WHERE ta.user_id IS DISTINCT FROM COALESCE(t.assignee_id, t.assigned_to);


-- ============================================================================
-- ADIM 2 — GERİ DÖNÜŞÜ YOK. Yalnızca ADIM 0'ın sonucunu ve ADIM 1'in
-- (yedek) tamamlandığını gördükten sonra çalıştırın.
-- ============================================================================
-- Görevin birincil atananıyla (assignee_id/assigned_to) EŞLEŞMEYEN tüm
-- task_assignees satırlarını siler — yani yalnızca "ek atanan" kayıtları.
-- Birincil atamanın kendisi bu tabloda AYRICA bir satır olarak dursa bile
-- (bazı görevlerde backfill sırasında olabilir), o satır BURADA silinmez —
-- WHERE koşulu yalnızca birincilden FARKLI olanları hedefliyor.
DELETE FROM public.task_assignees ta
USING public.tasks t
WHERE t.id = ta.task_id
  AND ta.user_id IS DISTINCT FROM COALESCE(t.assignee_id, t.assigned_to);


-- ============================================================================
-- ADIM 3 (opsiyonel) — doğrulama
-- ============================================================================
-- 0 dönmeli (ADIM 2 sonrası artık "ek" kayıt kalmamalı).
SELECT count(*) AS remaining_extra_rows
FROM public.task_assignees ta
JOIN public.tasks t ON t.id = ta.task_id
WHERE ta.user_id IS DISTINCT FROM COALESCE(t.assignee_id, t.assigned_to);
