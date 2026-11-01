# Cloudflare D1 initialization — KoVIS

## Status

The GitHub Actions workflow `.github/workflows/initialize-d1.yml` is a **manual initial database setup only**, not a production deploy pipeline. It is stored on the feature branch and may not appear in the Actions UI until a workflow file exists on the repository default branch. Do not merge the feature branch merely to enable the workflow: application authentication is incomplete.

## Required setup (owner action)

1. Create a narrowly scoped Cloudflare API token with D1 edit permissions for the relevant Cloudflare account. Do not paste the token into a chat, issue, or source file.
2. In GitHub repository Settings → Secrets and variables → Actions, add `CLOUDFLARE_API_TOKEN` as a repository secret.
3. Create GitHub environment `kovis-database` with required reviewer approval where supported.
4. After reviewing the SQL, make the workflow available on the default branch as a standalone reviewed workflow change. Do **not** merge unfinished application code.
5. In Actions → KoVIS D1 initial schema (manual), select Run workflow, type `INITIALIZE-KOVIS-D1`, and approve the environment if prompted.

## Safety notes

- Target: `kovis-production` (Cloudflare D1 ID `6cc17891-021d-4839-a926-4b312fe92563`).
- The workflow refuses to initialize a database that already has application tables.
- Run it **once**. If a step fails after creating tables, stop and inspect the schema. Do not rerun without a recovery plan.
- A successful schema initialization does **not** mean KoVIS is ready to accept real visitor data. Authentication integration, verified-email flows, account provisioning, tests, and deployment remain incomplete.
- Do not publish a public Worker until these prerequisites are satisfied.
