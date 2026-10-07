// API client. PoolOS's Worker serves the measuring API under /api/measure,
// behind Cloudflare Access (the sign-in cookie rides along on same-origin
// requests). Paths below keep the original /api/... shape after the prefix.

const BASE = '/api/measure';  // same origin

async function req(path, opts = {}) {
  const r = await fetch(BASE + path.replace(/^\/api/, ''), {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });
  if (!r.ok) {
    let msg = `HTTP ${r.status}`;
    try {
      const j = await r.json();
      msg = j.detail || JSON.stringify(j);
    } catch {}
    throw new Error(msg);
  }
  if (r.status === 204) return null;
  const ct = r.headers.get('content-type') || '';
  if (ct.includes('application/json')) return r.json();
  return r.text();
}

export const api = {
  health: () => req('/api/health'),

  listJobs: () => req('/api/jobs'),
  getJob: (id) => req(`/api/jobs/${id}`),
  createJob: (data) => req('/api/jobs', { method: 'POST', body: JSON.stringify(data) }),
  updateJob: (id, data) => req(`/api/jobs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteJob: (id) => req(`/api/jobs/${id}`, { method: 'DELETE' }),

  reconstruct: (id) => req(`/api/jobs/${id}/reconstruct`, { method: 'POST' }),
  validate: (id) => req(`/api/jobs/${id}/validate`, { method: 'POST' }),
  swapAb: (id) => req(`/api/jobs/${id}/swap-ab`, { method: 'POST' }),
  orderForm: (id) => req(`/api/jobs/${id}/order-form`, { method: 'POST' }),
  orderFormPdfUrl: (id) => `${BASE}/jobs/${id}/order-form.pdf`,

  // Liner. `linerTakeoff` never fails on a bad job — the verdict is in the
  // body — so the review screen can show what is wrong instead of an error.
  linerTakeoff: (id) => req(`/api/jobs/${id}/liner-takeoff`, { method: 'POST' }),
  linerOrderForm: (id) => req(`/api/jobs/${id}/liner-order-form`, { method: 'POST' }),
  linerOrderFormPdfUrl: (id) => `${BASE}/jobs/${id}/liner-order-form.pdf`,
  linerShapes: () => req('/api/liner/shapes'),

  listFixtures: () => req('/api/fixtures'),
  loadFixture: (name) => req(`/api/fixtures/${name}`),
};
