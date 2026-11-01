# KoVIS production deployment checklist

This branch is a staging area for migrating KoVIS away from ChatGPT Sites identity. **Do not deploy the existing application as a public visitor system yet.**

## Required implementation before launch

1. Replace Sites identity with native email/password registration and login. Use a reputable password-hashing implementation compatible with Cloudflare Workers (salted, deliberately expensive password KDF), constant-time comparisons, generic authentication errors, rate limiting, and secure HttpOnly/Secure/SameSite cookies.
2. Add email verification, password reset with single-use expiring tokens, session rotation/revocation, and CSRF protection for state-changing cookie-authenticated routes.
3. Restrict public signup to the visitor role; guard/admin provisioning must require an authenticated administrator. Protect the first-admin bootstrap behind a one-time secret and a non-public setup window.
4. Update all API routes and role checks to use the new server-side session identity; remove the Sites authentication dependency and any mock identity fallbacks from production.
5. Create and review D1 migrations for credentials, sessions, verification/reset tokens, and existing user identities; plan account migration and rollback.
6. Replace the placeholder D1 database ID with the actual production database binding. Configure Cloudflare Workers/Vinext build, secrets, migrations and deployment in a tested environment.
7. Run integration tests for login, logout, password reset, CSRF, session expiry, RBAC, visit approvals, check-in/out, audit logs and concurrency; verify production smoke tests before publishing QR codes.
8. Define data retention, privacy notice, backups, abuse monitoring and an incident response contact before collecting real visitor personal information.

## Existing repository constraints

- `package.json` uses Next.js/Vinext, Wrangler, Drizzle and D1.
- `vite.config.ts` contains a placeholder database ID and Sites-specific plugins.
- `README.md` states that the existing authentication depends on ChatGPT Sites.

## Deployment prerequisites

Cloudflare account authorization, a production D1 database, production secrets and a verified domain/Workers route are required. Never commit credentials or database exports.

Status: **planning / not deployed**.
