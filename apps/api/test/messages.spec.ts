import { beforeAll, describe, expect, it } from 'vitest';
import { checkMessageDoc } from '../src/messages';
import { call, migrate } from './helpers';

beforeAll(migrate);

const base = '/api/boards/messages/posts';
const POST = { text: 'Gate code at the Birch Lane pool is 4417 this week', category: 'Access code' };
type Doc = { id: string; data: Record<string, unknown>; updated_at: string; deleted?: boolean };

describe('message board', () => {
	const doc = `${base}/m-20261009-142233-ab12`;

	it('saves a post and stamps who wrote it and when, whatever the form says', async () => {
		const put = await call(doc, { method: 'PUT', as: 'tech@example.test', body: { data: { ...POST, text: `  ${POST.text}  `, author: 'someone-else@example.test', postedAt: '2020-01-01T00:00:00.000Z' } } });
		expect(put.status).toBe(200);
		const got = (await (await call(doc, { as: 'other@example.test' })).json()) as { data: Record<string, unknown> };
		expect(got.data.author).toBe('tech@example.test');
		expect(got.data.postedAt).not.toBe('2020-01-01T00:00:00.000Z');
		expect(typeof got.data.postedAt).toBe('string');
		expect(got.data.text).toBe(POST.text);
		expect(got.data.editedAt).toBeUndefined();
	});

	it('refuses a bad id, category, empty or long text, or an extra field', async () => {
		const put = (id: string, data: unknown) => call(`${base}/${id}`, { method: 'PUT', body: { data } });
		const id = 'm-20261009-150000-zz99';
		expect((await put('r-20261009-150000-zz99', POST)).status).toBe(400);
		expect((await put('m-2026-1', POST)).status).toBe(400);
		expect((await put(id, { ...POST, category: 'Gossip' })).status).toBe(400);
		expect((await put(id, { ...POST, category: undefined })).status).toBe(400);
		expect((await put(id, { ...POST, text: '   ' })).status).toBe(400);
		expect((await put(id, { ...POST, text: 'x'.repeat(1001) })).status).toBe(400);
		expect((await put(id, { ...POST, pinned: true })).status).toBe(400);
		expect((await call(`/api/boards/messages/threads/${id}`, { method: 'PUT', body: { data: POST } })).status).toBe(400);
		expect((await put(id, { ...POST, text: 'x'.repeat(1000) })).status).toBe(200);
	});

	it('lets only the author or an owner change or delete a post', async () => {
		expect((await call(doc, { method: 'PATCH', as: 'other@example.test', body: { data: { text: 'hijacked' } } })).status).toBe(403);
		expect((await call(doc, { method: 'PUT', as: 'other@example.test', body: { data: POST } })).status).toBe(403);
		expect((await call(doc, { method: 'DELETE', as: 'other@example.test' })).status).toBe(403);
		const kept = (await (await call(doc)).json()) as { data: Record<string, unknown> };
		expect(kept.data.text).toBe(POST.text);
	});

	it('lets the author edit the text, stamping editedAt and keeping the author', async () => {
		const before = (await (await call(doc)).json()) as { data: Record<string, unknown> };
		const patch = await call(doc, { method: 'PATCH', as: 'tech@example.test', body: { data: { text: 'Gate code changed to 5520', author: 'other@example.test' } } });
		expect(patch.status).toBe(200);
		const got = (await (await call(doc)).json()) as { data: Record<string, unknown> };
		expect(got.data).toMatchObject({ text: 'Gate code changed to 5520', category: 'Access code', author: 'tech@example.test', postedAt: before.data.postedAt });
		expect(typeof got.data.editedAt).toBe('string');
	});

	it('lets an owner delete any post', async () => {
		expect((await call(doc, { method: 'DELETE', as: 'owner@example.test' })).status).toBe(200);
		expect(((await (await call(doc)).json()) as { exists: boolean }).exists).toBe(false);
	});

	it('is not listed as a board page', async () => {
		const res = (await (await call('/api/boards', { as: 'owner@example.test' })).json()) as { boards: { slug: string }[] };
		expect(res.boards.map((b) => b.slug)).not.toContain('messages');
	});

	it('tells a polling client about new posts and deletions since it last looked', async () => {
		await call(`${base}/m-20261009-160000-aaaa`, { method: 'PUT', body: { data: { ...POST, category: 'General', text: 'First' } } });
		const all = (await (await call(base)).json()) as { docs: Doc[] };
		const since = all.docs.find((d) => d.id === 'm-20261009-160000-aaaa')!.updated_at;
		await call(`${base}/m-20261009-160001-bbbb`, { method: 'PUT', as: 'owner@example.test', body: { data: { ...POST, category: 'Equipment', text: 'Second' } } });
		await call(`${base}/m-20261009-160000-aaaa`, { method: 'DELETE' });
		const changes = (await (await call(`${base}?since=${encodeURIComponent(since)}`)).json()) as { docs: Doc[] };
		expect(changes.docs).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ id: 'm-20261009-160001-bbbb', data: expect.objectContaining({ author: 'owner@example.test', text: 'Second' }) }),
				expect.objectContaining({ id: 'm-20261009-160000-aaaa', deleted: true }),
			]),
		);
	});

	it('checks the shape directly', () => {
		const id = 'm-20261009-142233-ab12';
		expect(checkMessageDoc('posts', id, POST)).toBeNull();
		expect(checkMessageDoc('posts', 'bad', POST)).toMatch(/ids look like/);
		expect(checkMessageDoc('posts', id, { ...POST, category: 'toString' })).toMatch(/category/);
		expect(checkMessageDoc('posts', id, { ...POST, colour: 'red' })).toMatch(/Unexpected field "colour"/);
		expect(checkMessageDoc('notes', id, POST)).toMatch(/only keeps "posts"/);
	});
});
