-- Creates your organisation and its first owner. Edit the values, then run:
--   wrangler d1 execute diving-board --remote --file scripts/seed.sql
-- The email must match the one you sign in with through Cloudflare Access.
INSERT INTO orgs (id, name, created_at)
VALUES ('00000000-0000-4000-8000-000000000001', 'Your Pool Company', datetime('now'));

INSERT INTO users (id, org_id, email, name, role, created_at)
VALUES ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001',
        'you@example.com', 'Your Name', 'owner', datetime('now'));
