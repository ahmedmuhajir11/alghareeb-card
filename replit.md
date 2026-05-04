# AlGhareeb Card | الغريب كارد

## Overview

A professional Arabic-language website for digital services — game top-ups, app charging, financial transfers, and more. The site displays services and pricing automatically, then sends orders to WhatsApp with a pre-filled Arabic message. No payment gateway is involved.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/alghareeb-card)
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Sessions**: express-session
- **File uploads**: multer

## Key Features

- Full Arabic RTL layout with Cairo font
- Dark black + purple neon gaming aesthetic
- 5 service sections: Games, Apps, Money Transfers, Host Salary, Credit Recharge
- Currency support: USD, EUR, TRY, SYP (exchange rates managed by admin)
- WhatsApp order integration (number: 00905378221375)
- Search by Arabic or English name within sections
- Animated marquee text ticker on homepage
- Auto-play image slider on homepage

## Auth System (Custom — no Clerk)

- Email + password registration/login via `/api/auth/register` and `/api/auth/login`
- Google OAuth button (links to `/api/auth/google` — needs GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET env vars on Render)
- Session-based auth with express-session (`SESSION_SECRET`)
- Profile setup page: country + phone + currency (currency locked after first save)
- Account numbers: 4-digit sequential starting from 1001
- Auth context (`src/lib/auth.tsx`) with `useAuth()` hook
- Section and Item pages are protected — shows login prompt if not authenticated
- AppLayout shows user balance, account number, and level in sidebar when logged in

## Wallet & Deposits System

- Header shows purple "إضافة رصيد" button when balance is zero, else a balance pill (both link to `/payment-methods`). Currency dropdown removed; user currency is locked at signup.
- Deposit flow: user picks a payment method on `/payment-methods`, fills the embedded `DepositForm` (amount + receipt image), submits to `POST /api/deposits` (multipart).
- **Sham Cash (Syria) special case**: Detected by `isShamCashMethod` (matches "شام" in Arabic name or "sham" in English). Shows a currency selector with USD/TRY/SYP and live conversion preview ("سيُضاف لرصيدك: X TRY"). Other deposit methods only ever use the user's account currency.
- Frontend conversion preview reads exchange rates from `GET /api/settings` (cached 60s) using `usdTo*` fields with USD as base.
- Admin reviews via `/admin` → "طلبات الإيداع" tab (default). `DepositsManager.tsx` lists by status (pending/approved/rejected/all) with approve/reject buttons.
- On approve: `PATCH /api/admin/deposits/:id` runs in a transaction — locks the deposit row + user row (`SELECT ... FOR UPDATE`), updates status, converts the deposit amount from `deposit.currency` to `user.currency` using settings rates if they differ, increments `users.balance` with the converted amount, inserts a `wallet_transactions` row whose description shows the conversion (e.g. `إيداع عبر شام كاش (10 USD ≈ 320.00 TRY)`). Push notification reports the credited amount in user currency. If conversion fails (missing rate), the request is rolled back with HTTP 400.
- Order/purchase flow: `POST /api/orders` accepts only `{ itemId, packageId?, quantity?, targetId? }`. Server fetches item/package, computes USD price from the DB, converts to user's currency using `settings` rates, deducts balance under `FOR UPDATE` lock. Client-supplied `amount`/`currency` are IGNORED to prevent underpayment.
- On insufficient balance: returns 400 with `code: "INSUFFICIENT_BALANCE"`. Frontend toasts and redirects to `/payment-methods`.
- After successful order, frontend refetches user balance, then opens the WhatsApp order message.

## DB Tables (local PostgreSQL + Neon for production)

- `users` — email, password_hash, google_id, phone, country, balance, currency, level, is_verified, profile_completed
- `deposit_requests` — payment requests waiting admin approval
- `identity_verifications` — KYC documents
- `orders` — order history
- `wallet_transactions` — balance movements
- Full admin panel at /admin (login: abuhani / abohane12345)
- **Clerk authentication**: Users must sign in to access sections (/section/*, /item/*)
- **Profile completion**: After signup, users must set country, phone, and currency (currency is locked after first save)
- Public pages (home, payment-methods, about) do not require login

## Admin Capabilities

- Manage sections (add/edit/delete with logos)
- Manage items/apps within sections
- Manage packages (pricing tiers) per item
- Manage exchange rates (USD to TRY/SYP/EUR)
- Edit marquee text
- Manage homepage slider images
- Image upload support
- **Money Transfers section (id=3)**: Uses an embedded `MoneyTransferForm` (no items/packages). Customer fields: recipient name, amount, currency, country, province, city/village → sent via WhatsApp. Currency list is admin-editable in `Settings → moneyTransferCurrencies` (comma-separated string in DB, default `دولار,ليرة تركية,يورو,سوري`). The admin "Money Transfers" section view shows an explanatory panel, not the standard items grid.
- **App Charging section (id=2)**: Single-item form with `currencyUnit` Select and `minQuantity` field. Currency unit options live in `CURRENCY_UNITS` in `SectionsManager.tsx`: `ماسات, شدات, جواهر, توكنز, نقاط, رصيد, ذهب, كاش داخلي, ليرة, فاصولياء, أخرى`.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Architecture

- `lib/api-spec/openapi.yaml` — OpenAPI contract
- `lib/db/src/schema/` — Database tables: settings, sections, items, packages, slider_images, user_profiles
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/alghareeb-card/src/` — React frontend
- Uploads stored at `artifacts/api-server/uploads/`, served at `/api/uploads/:filename`

## WhatsApp Order Flow

When a user selects a package and enters their ID, clicking the order button opens WhatsApp with a pre-filled Arabic message including: item name, package label, quantity, price in selected currency, and user ID.

## Push Notifications (Per-User Targeted)

- Web Push via `web-push` library. VAPID keys are currently hardcoded in `routes/push.ts` (legacy — should be moved to env later).
- `push_subscriptions` table has `user_id` column (indexed) that links a browser endpoint to a specific user.
- `POST /api/push/subscribe` upserts the subscription, capturing `req.session.userId` and using `COALESCE(EXCLUDED.user_id, push_subscriptions.user_id)` so it never wipes a previously-mapped user when an unauthenticated visit re-registers.
- `sendPushToUser(userId, title, body, url)` helper in `routes/push.ts` sends a notification to all devices belonging to a user. Stale endpoints returning 404/410 are auto-deleted.
- Wired into admin actions in `admin.ts` (deposit & order approve/reject) and `admin-users.ts` (balance add/deduct). All push calls fire AFTER `COMMIT` and use `.catch(() => {})` so they never break the admin response.
- Admin can pass an optional `customMessage` field on each action — frontend `OrdersManager.tsx` and `DepositsManager.tsx` send it together with the action.
- `PushPermissionBanner.tsx` is gated by `useAuth()` and only shows once the user is signed in. `usePushNotifications` re-registers on mount so the user_id mapping is created the first time a logged-in user visits after the column was added.
