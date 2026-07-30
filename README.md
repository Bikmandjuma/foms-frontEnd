# Field Operation MS — Frontend

A React admin panel for the Field Operation MS backend. Built on top of the
original Huska admin panel — nothing removed, a lot added.

## Setup

```bash
npm install
cp .env.example .env      # points at http://localhost:4000/api by default
npm run dev
```

Run the backend first (see its own README — including the one-time
`npx tsx scripts/backfill-permissions.ts` if you already had a tenant before
this update). Log in, and the sidebar/dashboard will reflect whatever your
role's real `permissions` array allows.

## What's new in this pass

- **Real permissions**, not name-guessing. `src/permissions/permissions.js`
  now just reads `user.role.permissions` (an actual array from the backend)
  — no more inferring access from a role's name.
- **Roles page** now has an actual permission-editing UI: grouped checkboxes
  (Users, Roles, Programs, Respondents, Assignments, Replacement requests,
  Field monitoring, Activity logs), fetched live from `/api/meta/permissions`.
- **New sidebar sections**: Replacement requests, Field monitoring, Activity
  logs — alongside the existing Users/Roles/Programs/Respondents/Assignments/
  Tenants groups.
- **Working notification bell.** Click it — it's a real dropdown showing your
  actual notifications (assigned to a program, assigned a respondent,
  replacement request needs your review/was decided), with unread counts,
  mark-as-read, and mark-all-read. New ones arrive instantly via Socket.io
  without a page refresh.
- **Live "online users" widget** — the sidebar footer and dashboard both show
  a real, live count that updates the instant someone connects or
  disconnects (Socket.io presence), not a poll.
- **Live activity feed** on both the Dashboard and the new Activity Logs page
  — updates in real time as anything happens anywhere in the tenant.
- **Dashboard rewrite** with real charts driven by `/api/dashboard/summary`:
  a 7-day field check-in area chart, a respondent-outcomes donut, a
  programs-by-status bar chart, plus the live activity feed and online-users
  widgets.
- Program and Respondent forms now include the new research-operations
  fields (study scenario, project status, target sample size, dates;
  consent + fieldwork outcome).
- Theme still defaults to light; dark mode is still a manual per-device
  toggle in the top bar — untouched by any of the above.

## Architecture (unchanged pattern, more of it)

```
src/
  api/            # one file per resource — the only place HTTP calls happen
  context/        # Auth, Theme, Socket, Presence, Notifications
  permissions/    # ACTIONS + real permission checks (backend-driven now)
  components/     # Sidebar, Topbar (now with real bell dropdown), DataTable, forms
  pages/
    replacements/ ReplacementRequestsPage.jsx   (NEW)
    monitoring/   FieldMonitoringPage.jsx       (NEW)
    activity/     ActivityLogsPage.jsx          (NEW)
    ...           (all previous pages, several updated for new fields)
```
