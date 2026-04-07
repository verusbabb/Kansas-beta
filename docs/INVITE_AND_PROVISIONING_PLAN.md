# Invite & user provisioning — phased plan

This document breaks work into phases you can execute in order. **Start a phase only when you are ready**; each phase lists prerequisites and deliverables.

**Goals (summary)**

- **Send invite** from **Admin → member search**: per directory row, create **`users`** row as **`viewer`** only when missing; **never change existing roles**.
- **Auth0 (Database connection)**: create user if needed, obtain **password-change ticket URL**, email via **SendGrid**.
- Track **`lastInviteSentAt`** on the directory row (or agreed source of truth) for **Send** vs **Resend invite**.
- Later: **bulk invite** for all not yet invited (same pipeline, batched).

**Non-goals in early phases**

- Google/social invite flows (product copy or skip button).
- Self-service email change (Database users) — optional later phase.
- Account linking (Gmail → company email migration).

---

## Phase 0 — Auth0 & SendGrid prerequisites

**You do this in dashboards; minimal app code.**

### Auth0

- [ ] **Database connection**: sign-ups **disabled** (invite-only) — already done per your note.
- [ ] **Machine-to-machine (M2M)** application authorized for **Auth0 Management API** with scopes sufficient for:
  - create/read/update users (exact scope names per current Auth0 docs),
  - **password-change tickets** (e.g. `create:user_tickets` or equivalent).
- [ ] Note **Database connection name** and **SPA Application Client ID** (for ticket payload).
- [ ] Confirm **Post Login Action** still adds `https://kansas-beta-api/email` to the access token for the SPA client.
- [ ] **Secrets** (for backend env only): Auth0 domain, M2M client id/secret, SPA client id (if not public), connection name.

### SendGrid

- [ ] Account + **API key** (stored only on server).
- [ ] **Sender authentication** (SPF/DKIM) for your sending domain or subdomain (e.g. `send.kansasbeta.org`).
- [ ] Decide **trial vs paid** tier given expected **first-month** volume.

### Application URLs

- [ ] **Invite / password links** in emails should use a **configurable base URL** (e.g. `APP_PUBLIC_URL`) so GCP vs `kansasbeta.org` cutover is one env change.

**Exit criteria:** M2M token can create a test DB user and create a password-change ticket; SendGrid can send a test transactional email from your verified sender.

---

## Phase 1 — Configuration & secrets in the backend

- [ ] Add **typed config** (e.g. Nest `ConfigModule`) for:
  - Auth0: domain, M2M credentials, database **connection** id or name, **SPA client id**, optional audience nuances for Management API.
  - SendGrid: API key, **from** address, optional template id.
  - **Public site URL** for email copy and `result_url` on tickets.
- [ ] Document variables in `.env.example` (no real secrets).
- [ ] **Never** expose M2M secret or SendGrid key to the frontend.

**Exit criteria:** Backend boots with new env vars validated (fail fast if invite features enabled but misconfigured).

---

## Phase 2 — Database: invite timestamp

- [ ] Add nullable timestamp on the row admins see in member search, e.g. **`people.lastInviteSentAt`** (name as you prefer).
- [ ] Expose field on **`PersonResponseDto`** / list API used by admin directory.
- [ ] Frontend **`PersonResponse`** type updated.

**Exit criteria:** Migration applied; API returns the field (null for existing rows).

---

## Phase 3 — Core invite service (backend)

Implement a **single orchestration function** used by both single-row and (later) bulk invite.

**Behavior (agreed rules)**

1. Load **`Person`** by id; require **email**; normalize email.
2. **`users`** row:
   - If **no** row for that email: **create** with **`role: viewer`**, names optional copy from `Person`.
   - If **row exists**: **do not** change **role** or demote/promote; proceed with Auth0/email as needed.
3. **Auth0 (Database only for v1)**:
   - If user has **`auth0Id`**: assume linked; **do not** create duplicate Auth0 user.
   - If no **`auth0Id`**: Management API **create user** (random password, not emailed), store **`auth0Id`**.
   - **Password-change ticket** → obtain **ticket URL** for email body.
4. **SendGrid**: send transactional message with link + short instructions.
5. **On full success**: set **`people.lastInviteSentAt = now`** (and transaction boundaries as appropriate).
6. **Failure handling**: if Auth0 succeeds but email fails, **do not** treat as complete (avoid “invited” timestamp without mail); log and return error for retry.

**Edge cases to code explicitly**

- [ ] **Duplicate email** / unique constraint on `users.email`.
- [ ] Auth0 user exists by email but **`auth0Id`** missing locally → **link** via Management API lookup + PATCH local user.
- [ ] **Google-only** users: v1 may **skip** Auth0 DB create with clear API error or feature flag (product decision).

**Exit criteria:** Unit/integration tests or manual script can invite one test `Person` end-to-end in dev.

---

## Phase 4 — HTTP API (admin-only)

- [ ] `POST /people/:id/send-invite` (or under `/admin/...` if you prefer) guarded by **`JwtAuthGuard`**, **`UserLookupGuard`**, **`RolesGuard`**, **`UserRole.ADMIN`** (adjust if editors may send).
- [ ] Response: e.g. `{ lastInviteSentAt, resent: boolean }` or 4xx with safe message.
- [ ] OpenAPI / Swagger annotations.

**Exit criteria:** Admin can call endpoint with Bearer token; non-admin receives 403.

---

## Phase 5 — Admin UI: per-row Send invite / Resend

- [ ] In **`MemberSearch.vue`** (admin variant): column with button **Send invite** vs **Resend invite** based on `lastInviteSentAt`.
- [ ] Loading state per row; toast on success/failure; refresh row or patch timestamp from response.
- [ ] Optional: confirm dialog on resend.

**Exit criteria:** One-off invites and testing work without bulk tooling.

---

## Phase 6 — Observability & safety

- [ ] Structured logs: `personId`, email (or hash), invite success/fail reason (no secrets).
- [ ] Rate limiting or cooldown per **person** or per **admin** to prevent misclicks (optional).
- [ ] **SendGrid** bounce/webhook handling (optional v1; valuable before big bulk).

**Exit criteria:** You can diagnose failed invites from logs in staging/prod.

---

## Phase 7 — Bulk invite (later)

**Prerequisite:** SendGrid (or other) plan supports volume; Auth0 Management API rate limits understood.

- [ ] Reuse **Phase 3** orchestration in a **job** or **admin** action: query `lastInviteSentAt IS NULL` (plus your filters: has email, member-only, etc.).
- [ ] **Batch** processing with throttling, retries, **dry-run** count.
- [ ] Progress UI or export of failures.

**Exit criteria:** Safe batch run in staging; idempotent re-runs.

---

## Phase 8 — Optional: Database user email change (self-service)

- [ ] `pendingEmail` + confirmation token flow; after confirm, Management API **PATCH** Auth0 user email; update `users.email` / `people.email`; session refresh story.
- [ ] Explicit **non-goal** in UI for **Google** login email (link to Google account settings or “contact admin”).

**Exit criteria:** Documented UX and API; no duplicate Auth0 users.

---

## Quick reference — responsibility split

| Concern | System |
|--------|--------|
| Password / ticket URL | **Auth0** Management API |
| Delivering email | **SendGrid** |
| Role **`viewer`** on first create only | **Your DB** |
| Role changes | **Admin UI** only (existing users) |
| “Who was invited when” | **`lastInviteSentAt`** (or chosen column) |

---

## How to use this doc

When you start a phase, tick boxes as you go or replace with PR links. If scope changes (e.g. editors may send invites), update **Phase 4** and **Phase 5** only.
