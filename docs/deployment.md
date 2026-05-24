# Deployment Workflow

## Environments

Use two runtime environments:

- `staging`: internal testing before production.
- `production`: live Akres Music system.

Use two separate MongoDB databases. Do not point staging and production to the same database.

Recommended names:

- Staging database: `akres-music-staging`
- Production database: `akres-music-production`

The databases can live in the same MongoDB cluster, but separate clusters are safer for production.

## Branch Flow

- Pull requests to `staging` or `main` run CI.
- Push to `staging` deploys staging.
- Push to `main` deploys production.

Recommended release flow:

1. Work in a feature branch.
2. Open pull request into `staging`.
3. Test the staging deployment.
4. Open pull request from `staging` into `main`.
5. Merge to `main` to deploy production.

## GitHub Environments

Create these GitHub Environments:

- `staging`
- `production`

Add manual approval protection to `production` if production deploys must be reviewed.

Each environment needs these secrets:

- `AUTH_SECRET`
- `CRON_SECRET`
- `MONGODB_URI`
- `MONGODB_DB`
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Each environment needs this variable:

- `AUTH_URL`

Example values:

```text
staging:
AUTH_URL=https://staging-akres-music.example.com
MONGODB_DB=akres-music-staging

production:
AUTH_URL=https://akres-music.example.com
MONGODB_DB=akres-music-production
```

## Vercel Environment Variables

Also configure the same runtime variables in Vercel:

- Preview environment for staging.
- Production environment for production.

Required variables:

- `AUTH_SECRET`
- `CRON_SECRET`
- `AUTH_URL`
- `MONGODB_URI`
- `MONGODB_DB`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

## Local Development

Local development can keep using `.env.local`:

```text
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=akres_music_academic
AUTH_SECRET=replace-with-a-long-random-secret
CRON_SECRET=replace-with-a-long-random-secret
AUTH_URL=http://localhost:3000
```

## Notification Scheduler Runner

Phase notifications runner is available via:

- `POST /api/notifications/run`
- `GET /api/notifications/run` (run + preview last notifications)

Supported query:

- `?mode=morning`
- `?mode=preclass3h`

Access options:

- Logged-in `System Manager` / `Academic Staff`, or
- Bearer token `Authorization: Bearer <CRON_SECRET>`, or
- Query `?secret=<CRON_SECRET>`

Recommended cron target:

```text
POST https://<your-domain>/api/notifications/run
Authorization: Bearer <CRON_SECRET>
```

Current rule:

- Morning reminder (`mode=morning`) untuk kelas hari ini.
- Pre-class reminder (`mode=preclass3h`) saat sesi masuk jendela 3 jam sebelum mulai.

## GitHub Cron Workflow

Workflow file:

- `.github/workflows/notifications-cron.yml`

Schedule:

- `0 0 * * *` => morning reminder jam `07:00 WIB`
- `*/15 * * * *` => checker reminder `T-3 jam` sebelum kelas

Required in both GitHub Environments (`staging`, `production`):

- Secret: `CRON_SECRET`
- Variable: `AUTH_URL`

Manual run is supported via `workflow_dispatch` with target:

- `all`
- `staging`
- `production`
