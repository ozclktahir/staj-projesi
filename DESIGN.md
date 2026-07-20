# DESIGN.md — UI/UX Tasarım Sistemi

**Proje:** İş Yönetim Sistemi (Workspace App)  
**Estetik:** Linear (minimalist, hızlı) + Notion (modüler, temiz)  
**Güncelleme:** 20 Temmuz 2026

---

## 1. Temel Felsefe

- **Linear:** Az gürültü, hızlı etkileşim, ince kenarlıklar, yüksek okunabilirlik.
- **Notion:** Modüler bloklar, net hiyerarşi, içerik odaklı boşluk kullanımı.
- **Genel ilke:** Bir ekranda tek odak; dekoratif gölge/gradient yerine işlevsel hiyerarşi.

---

## 2. Renk Paleti

### Marka (aktif tema)
- **Turuncu–siyah** ürün teması korunur (`--primary: 24 100% 50%`, koyu zemin).
- Dashboard shell: `bg-background` / `bg-card` / `border-border` / `text-primary`.

### Öncelik (Priority)
| Seviye | Görsel | Kullanım |
|--------|--------|----------|
| Critical | 🟣 | Rezerv (ileride) |
| High | 🔴 | `text-red-500` |
| Medium | 🟡 / turuncu | `text-primary` |
| Low | 🟢 | muted |

### Durum (Status)
| Durum | Görsel |
|-------|--------|
| To Do | ⚪ muted |
| In Progress | 🔵 / primary border |
| Review | 🟠 rezerv |
| Done | 🟢 emerald |

---

## 3. Tipografi

- **Font:** Geist Sans (mevcut Next font) — Inter alternatifi kabul edilir.
- **Hiyerarşi:**
  - Sayfa başlığı: `text-2xl font-semibold tracking-tight text-slate-900`
  - Bölüm: `text-sm font-semibold text-slate-900`
  - Gövde: `text-sm text-slate-600`
  - Meta: `text-xs text-slate-400`

---

## 4. Layout Prensipleri

### Shell
- Sol sidebar: sabit genişlik (~240px), `border-r border-slate-200`, `bg-white`.
- Ana alan: `bg-slate-50`, içerik `max-w-6xl` / kanbanda full-bleed flex.
- Header: ince, `bg-white/80 backdrop-blur`, `border-b border-slate-200`.

### Dashboard
- Üstte **3 özet kart:** Toplam Görev · Devam Eden · Tamamlanan (`grid grid-cols-1 md:grid-cols-3`).
- Altında proje listesi / son aktiviteler.

### Kanban
- Yatay `flex` / `grid` geniş sütunlar.
- Sütun: `bg-slate-100/70`, başlık + sayaç.
- Kart: `bg-white border border-slate-200 shadow-sm hover:shadow-md` geçişi.
- Sürükle-bırak: sonraki iterasyon (UI hazır, DnD opsiyonel).

### Görev detay (Slide-over)
- Sağdan açılan panel (`fixed inset-y-0 right-0`, ~420–480px).
- Bölümler: Detay · Checklist · Comments · Attachments.
- Overlay: `bg-slate-900/20`.

---

## 5. Bileşen Kuralları

- **Kart:** Varsayılan gölge yok veya `shadow-sm`; hover’da `shadow-md`.
- **Buton (primary):** Turuncu CTA, `rounded-md`.
- **Buton (ghost):** slate metin, hover `bg-slate-100`.
- **Input:** `border-slate-200`, focus `ring-2 ring-slate-200` veya primary.
- **Radius:** `--radius: 0.5rem` (6–8px hissi).
- **Emoji / ikon:** Durum ve öncelikte küçük nokta veya Lucide ikon; aşırı emoji kullanma.

---

## 6. Navigasyon (Sidebar)

| Madde | Rota | İkon (Lucide) |
|-------|------|----------------|
| Dashboard | `/` | `LayoutDashboard` |
| Projects | `/projects` | `FolderKanban` |
| My Tasks | `/my-tasks` | `CheckSquare` |
| Favorites | `/favorites` | `Star` |
| Settings | `/settings` | `Settings` |

---

## 7. Erişilebilirlik & Hareket

- Odak halkası görünür olmalı.
- Hover/focus geçişleri `transition-shadow` / `transition-colors` (~150–200ms).
- Slide-over Escape ve overlay tıklaması ile kapanır.
- Renk bilgisi metin etiketiyle desteklenir (sadece renge güvenilmez).

---

## 8. Uygulama Notları

- Auth sayfaları marka paneli (siyah/turuncu) koruyabilir; dashboard shell slate-linear diline geçer.
- Dark mode token’ları korunur; slate dili özellikle light mode için tanımlıdır.
