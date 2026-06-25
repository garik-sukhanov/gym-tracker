# DDX Зал — учёт весов

PWA для записи подходов в зале DDX Fitness: сканируешь QR на тренажёре → вводишь вес и повторы → данные хранятся локально (офлайн) и выгружаются в таблицу. Опционально — облачный бэкап и синхронизация через Supabase.

Ставится на домашний экран iPhone как обычное приложение. App Store и аккаунт разработчика не нужны.

## Стек

- React + Vite + TypeScript
- `vite-plugin-pwa` — манифест, service worker, офлайн, установка
- `@zxing/browser` — сканер QR через камеру
- `Dexie` (IndexedDB) — локальная база
- `@supabase/supabase-js` — облачная синхронизация (опционально)
- `xlsx` (SheetJS) — экспорт в Excel/CSV

## Запуск

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # сборка в dist/
npm run preview    # предпросмотр собранной версии
```

> Камера (`getUserMedia`) работает только в защищённом контексте: `localhost` или **HTTPS**. На самом iPhone тестировать удобнее всего после деплоя на HTTPS-хостинг (см. ниже) или через https-туннель.

## Установка на iPhone

1. Задеплой проект на HTTPS (Vercel / Netlify / GitHub Pages — бесплатно).
2. Открой адрес в **Safari** на iPhone.
3. «Поделиться» → «На экран „Домой"».
4. Запусти с домашнего экрана — приложение откроется на весь экран, камера и офлайн работают (iOS 16.4+).

## Каталог тренажёров (Фаза 0)

Файл [`src/data/catalog.json`](src/data/catalog.json) пока пустой. Он заполняется на Фазе 0: по одной реальной ссылке с QR определяется структура URL, перебираются все номера и собираются `{ number, name, description, url }` для каждого тренажёра. Пока каталог пуст, скан показывает «Тренажёр №N» (имя можно ввести вручную) — всё остальное уже работает.

Разбор отсканированной ссылки — в [`src/lib/catalog.ts`](src/lib/catalog.ts) (`extractNumber`), там же `TODO(Фаза 0)`: подогнать под реальный формат ссылки DDX.

## Supabase (опционально)

1. Создай проект на [supabase.com](https://supabase.com).
2. В SQL-редакторе выполни:

```sql
create table if not exists sessions (
  id uuid primary key,
  title text,
  started_at timestamptz not null,
  ended_at timestamptz,
  updated_at timestamptz not null,
  deleted boolean not null default false
);

create table if not exists sets (
  id uuid primary key,
  session_id uuid not null,
  machine_number int,
  machine_name text not null,
  weight numeric,
  reps int,
  set_index int not null,
  rpe numeric,
  note text,
  performed_at timestamptz not null,
  updated_at timestamptz not null,
  deleted boolean not null default false
);

create index if not exists sets_updated_at_idx on sets (updated_at);
create index if not exists sessions_updated_at_idx on sessions (updated_at);
```

3. Скопируй `.env.example` в `.env` и впиши `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY` (Project Settings → API).

> Безопасность: anon-ключ в клиентском PWA публичен. Для личного использования это приемлемо как старт, но прежде чем класть туда важные данные — включи RLS и привяжи доступ к Supabase Auth (запланировано в Фазе 4).

## Структура

```
src/
  data/catalog.json     каталог тренажёров (Фаза 0)
  lib/
    catalog.ts          разбор QR → номер → тренажёр
    export.ts           выгрузка в Excel/CSV
    supabase.ts         клиент Supabase (по env)
    sync.ts             двусторонняя синхронизация
    id.ts, format.ts    утилиты
  components/Scanner.tsx сканер камеры
  screens/
    LogScreen.tsx       запись подходов
    HistoryScreen.tsx   журнал по дням
    ExportScreen.tsx    экспорт и синхронизация
  db.ts                 Dexie (sets, sessions)
  types.ts              типы предметной области
  App.tsx               оболочка + навигация
```

## Дорожная карта

- **Фаза 0** — каталог тренажёров из QR _(нужна одна реальная ссылка)_
- **Фаза 1** — каркас PWA ✅
- **Фаза 2** — сканер QR ✅ (структуру ссылки финализируем в Фазе 0)
- **Фаза 3** — лог подходов + IndexedDB ✅
- **Фаза 4** — синхронизация Supabase (клиент готов, нужна настройка проекта)
- **Фаза 5** — экспорт в таблицу ✅ (Excel/CSV; Google Sheets — позже)
- **Фаза 6** — UX: графики прогресса, таймер отдыха, быстрый ввод
