/**
 * The `messages` board: the team's message board, the app's Messages tab.
 *   posts/<id>   one post
 *
 * The Worker stamps who posted it and when; only the author or an owner may
 * change or remove a post (rule in boards.ts).
 */
export const CATEGORIES = ['General', 'Access code', 'Equipment', 'Dispatch note'] as const;
const ID = /^m-\d{8}-\d{6}-[a-z0-9]{4}$/;
const MAX_TEXT = 1000;
const ALLOWED = new Set(['text', 'category', 'author', 'postedAt', 'editedAt']);

export function checkMessageDoc(collection: string, id: string, data: Record<string, unknown>): string | null {
	if (collection !== 'posts') return 'The message board only keeps "posts"';
	if (!ID.test(id)) return 'Post ids look like "m-<yyyymmdd>-<hhmmss>-<4 letters>"';
	if (typeof data.text !== 'string' || !data.text.trim()) return '"text" is needed';
	if (data.text.length > MAX_TEXT) return `"text" must be at most ${MAX_TEXT} characters`;
	if (!(CATEGORIES as readonly unknown[]).includes(data.category)) return `category must be one of ${CATEGORIES.join(', ')}`;
	const extra = Object.keys(data).filter((k) => !ALLOWED.has(k));
	if (extra.length) return `Unexpected field "${extra[0]}"`;
	return null;
}

/**
 * Who posted it and when come from the sign-in, not the form, and never change.
 * An edit to an existing post is stamped with editedAt. Text is stored trimmed.
 */
export function stampMessage(data: Record<string, unknown>, previous: Record<string, unknown> | null, email: string, at: string) {
	const { editedAt: _ignored, ...rest } = data;
	return {
		...rest,
		...(typeof rest.text === 'string' ? { text: rest.text.trim() } : {}),
		author: previous?.author ?? email,
		postedAt: previous?.postedAt ?? at,
		...(previous ? { editedAt: at } : {}),
	};
}
