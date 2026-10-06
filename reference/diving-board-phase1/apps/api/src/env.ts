export interface Env {
  DB: D1Database;
  FILES: R2Bucket;
  ENVIRONMENT: string;
  /** Cloudflare Access team domain, e.g. "yourteam.cloudflareaccess.com". */
  ACCESS_TEAM_DOMAIN: string;
  /** Cloudflare Access application audience tag. */
  ACCESS_AUD?: string;
}

export type Role = 'owner' | 'admin' | 'office' | 'tech';

export interface CurrentUser {
  id: string;
  orgId: string;
  email: string;
  role: Role;
}

export type AppEnv = { Bindings: Env; Variables: { user: CurrentUser } };
