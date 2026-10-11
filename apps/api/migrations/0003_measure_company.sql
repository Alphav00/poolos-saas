-- Measure jobs per company (DECISIONS d0023). '' is the default company,
-- like the plain boards (src/company.ts), so jobs saved before this keep
-- their owner.
ALTER TABLE measure_jobs ADD COLUMN company TEXT NOT NULL DEFAULT '';
CREATE INDEX measure_jobs_company ON measure_jobs (company, updated_at);
