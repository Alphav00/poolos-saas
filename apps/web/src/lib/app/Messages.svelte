<script lang="ts">
  import { docId } from '../field/ids'
  import { untrack } from 'svelte'
  // The team's message board, saved on the `messages` board. The Worker stamps
  // who posted and when, and lets only the author or an owner remove a post.
  let { email = '', isOwner = false }: { email?: string; isOwner?: boolean } = $props()

  type Post = { text: string; category: string; author?: string; postedAt?: string; editedAt?: string }
  type Doc = { id: string; data?: Post; updated_at: string; deleted?: boolean }

  const CATEGORIES = ['General', 'Access code', 'Equipment', 'Dispatch note'] as const
  const API = '/api/boards/messages/posts'

  let posts = $state<Record<string, { data: Post; updated_at: string }>>({})
  let loaded = $state(false)
  let listNote = $state('')
  let text = $state('')
  let category = $state<string>('General')
  let sending = $state(false)
  let note = $state('')
  let now = $state(Date.now())
  let hidden = $state(document.visibilityState === 'hidden')

  const feed = $derived(
    Object.entries(posts)
      .map(([id, p]) => ({ id, ...p }))
      .sort((a, b) => (b.data.postedAt ?? b.updated_at).localeCompare(a.data.postedAt ?? a.updated_at)),
  )
  const ready = $derived(text.trim().length > 0 && text.length <= 1000)

  // Polled like the board runtime: everything once, then what changed since
  // the newest change seen (less 10 s, so a slow write is not missed).
  let newest = ''
  async function poll() {
    try {
      const since = newest ? new Date(Date.parse(newest) - 10_000).toISOString() : ''
      const res = await fetch(since ? `${API}?since=${encodeURIComponent(since)}` : API)
      if (!res.ok) throw new Error()
      const out = (await res.json()) as { docs: Doc[] }
      const next = { ...posts }
      for (const d of out.docs) {
        if (d.updated_at > newest) newest = d.updated_at
        if (d.deleted || !d.data) delete next[d.id]
        else next[d.id] = { data: d.data, updated_at: d.updated_at }
      }
      posts = next
      loaded = true
      listNote = ''
    } catch {
      listNote = 'Could not load messages. Trying again…'
    }
    now = Date.now()
  }

  // alive goes false when the screen closes, so a poll still in flight then
  // does not arm another timer and keep polling with nobody looking.
  let timer: ReturnType<typeof setTimeout> | undefined
  let alive = true
  function schedule() {
    clearTimeout(timer)
    if (!alive) return
    timer = setTimeout(async () => {
      await poll()
      schedule()
    }, hidden ? 15_000 : 3_000)
  }
  $effect(() => {
    alive = true
    untrack(() => poll().then(schedule))
    return () => {
      alive = false
      clearTimeout(timer)
    }
  })

  async function post() {
    if (!ready || sending) return
    sending = true
    note = ''
    try {
      const res = await fetch(`${API}/${docId('m')}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { text: text.trim(), category } }),
      })
      const out = await res.json()
      if (!res.ok) throw new Error(out.error?.message ?? 'Could not post the message')
      text = ''
      await poll()
      schedule()
    } catch (e) {
      note = e instanceof Error ? e.message : 'Could not post the message'
    } finally {
      sending = false
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this message?')) return
    try {
      const res = await fetch(`${API}/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(((await res.json()) as { error?: { message?: string } }).error?.message ?? 'Could not delete')
      const next = { ...posts }
      delete next[id]
      posts = next
    } catch (e) {
      note = e instanceof Error ? e.message : 'Could not delete'
    }
  }

  const who = (a?: string) => (a ? a.split('@')[0] : 'someone')
  function ago(iso: string | undefined, t: number) {
    if (!iso) return ''
    const s = Math.max(0, Math.round((t - Date.parse(iso)) / 1000))
    if (s < 45) return 'just now'
    if (s < 3600) return `${Math.round(s / 60)} min ago`
    if (s < 86_400) return `${Math.round(s / 3600)} h ago`
    if (s < 7 * 86_400) return `${Math.round(s / 86_400)} d ago`
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
</script>

<svelte:document
  onvisibilitychange={() => {
    hidden = document.visibilityState === 'hidden'
    if (!hidden) poll()
    schedule()
  }}
/>

<div class="bar"><span class="t">Message board</span></div>

<section class="card" style="margin-top:0">
  <label class="fl" for="new-message-text"><span class="h">New message</span>
    <textarea id="new-message-text" bind:value={text} maxlength="1000" rows="3" placeholder="e.g. Pump room key is back on the hook"></textarea>
  </label>
  <div class="seg cats" role="group" aria-label="Category">
    {#each CATEGORIES as c (c)}
      <button type="button" aria-pressed={category === c} onclick={() => (category = c)}>{c}</button>
    {/each}
  </div>
  <button class="btn" disabled={!ready || sending} onclick={post}>{sending ? 'Posting…' : 'Post'}</button>
  {#if note}<p class="alert" role="alert"><b>{note}</b></p>{/if}
</section>

<section class="card">
  {#if listNote}<p class="xs">{listNote}</p>{/if}
  {#if !loaded && !listNote}<p class="xs">Loading…</p>
  {:else if loaded && feed.length === 0}<p class="sm">No messages yet — post the first one.</p>{/if}
  {#each feed as m (m.id)}
    <article class="msg">
      <div class="row" style="justify-content:flex-start;gap:6px;flex-wrap:wrap">
        <b class="nm">{who(m.data.author)}</b>
        <span class="xs">{ago(m.data.postedAt, now)}{m.data.editedAt ? ' · edited' : ''}</span>
        <span class="chip" style="margin-left:auto">{m.data.category}</span>
      </div>
      <p class="tx">{m.data.text}</p>
      {#if isOwner || (email && m.data.author === email)}
        <button type="button" class="del" onclick={() => remove(m.id)} aria-label={`Delete message from ${who(m.data.author)}`}>Delete</button>
      {/if}
    </article>
  {/each}
</section>

<style>
  .fl { display: block; }
  .fl textarea { display: block; width: 100%; margin-top: 6px; font: inherit; font-size: 16px; font-weight: 700; color: var(--ink); border: 2px solid var(--line); border-radius: 12px; padding: 10px; background: var(--card); resize: vertical; }
  .fl textarea:focus { outline: none; border-color: var(--brand-primary); }
  .fl ::placeholder { color: var(--faint); font-weight: 600; }
  .cats { flex-wrap: wrap; }
  .cats button { flex: 1 1 40%; }
  .msg { padding: 10px 0; border-top: 1px solid var(--line); }
  .msg:first-of-type { border-top: 0; padding-top: 0; }
  .tx { margin-top: 4px; font-size: 16px; line-height: 1.35; white-space: pre-wrap; overflow-wrap: anywhere; }
  .del { font: inherit; font-size: 13px; font-weight: 800; color: var(--brand-link); background: none; border: 0; padding: 0 4px; min-height: 44px; cursor: pointer; }
</style>
