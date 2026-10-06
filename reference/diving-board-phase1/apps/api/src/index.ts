import { Hono } from 'hono';
import { cloudflareAccess, requireUser, type Authenticator } from './auth';
import type { AppEnv } from './env';
import { errorResponse } from './errors';
import { customers } from './routes/customers';
import { jobs } from './routes/jobs';
import { orders } from './routes/orders';

export function createApp(authenticate: Authenticator = cloudflareAccess) {
  const app = new Hono<AppEnv>();
  app.onError(errorResponse);
  app.get('/api/health', (c) => c.json({ ok: true }));

  const api = new Hono<AppEnv>();
  api.use('*', requireUser(authenticate));
  api.get('/me', (c) => c.json(c.get('user')));
  api.route('/', customers);
  api.route('/', jobs);
  api.route('/', orders);
  app.route('/api', api);

  app.notFound((c) => c.json({ error: { code: 'not_found', message: 'No such route' } }, 404));
  return app;
}

export default createApp();
