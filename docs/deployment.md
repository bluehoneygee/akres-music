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
- `AUTH_URL`
- `MONGODB_URI`
- `MONGODB_DB`

## Local Development

Local development can keep using `.env.local`:

```text
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=akres_music_academic
AUTH_SECRET=replace-with-a-long-random-secret
AUTH_URL=http://localhost:3000
```
