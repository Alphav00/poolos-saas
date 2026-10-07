<script lang="ts">
  import Field from './lib/field/Field.svelte'

  type Board = { slug: string; title: string; url: string; access: 'owner' | 'team' }
  type Me = { email: string; isOwner: boolean }

  let me = $state<Me | null>(null)
  let boards = $state<Board[]>([])
  let error = $state('')
  let importNote = $state<Record<string, string>>({})

  async function load() {
    try {
      const [m, b] = await Promise.all([fetch('/api/me'), fetch('/api/boards')])
      if (!m.ok || !b.ok) throw new Error(m.status === 401 ? 'Sign in again.' : 'Could not load PoolOS.')
      me = await m.json()
      boards = (await b.json()).boards
    } catch (e) {
      error = e instanceof Error ? e.message : 'Could not load PoolOS.'
    }
  }

  async function importFile(board: Board, input: HTMLInputElement) {
    const file = input.files?.[0]
    if (!file) return
    importNote[board.slug] = 'Importing…'
    try {
      const body = await file.text()
      const res = await fetch(`/api/boards/${board.slug}/_import`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
      const out = await res.json()
      if (!res.ok) throw new Error(out.error?.message ?? 'Import failed')
      importNote[board.slug] = `Imported ${out.imported} documents.`
    } catch (e) {
      importNote[board.slug] = e instanceof Error ? e.message : 'Import failed'
    } finally {
      input.value = ''
    }
  }

  load()

  let hash = $state(location.hash)
  const route = $derived(hash.replace(/^#\/?/, '').split('/').filter(Boolean))
</script>

<svelte:window onhashchange={() => (hash = location.hash)} />

{#if route[0] === 'field'}
  <Field path={route} />
{:else}

<main class="mx-auto min-h-dvh max-w-xl bg-white p-4 text-slate-900">
  <header class="mb-6 flex items-baseline justify-between gap-4">
    <h1 class="text-3xl font-bold">PoolOS</h1>
    {#if me}<p class="truncate text-base text-slate-600">{me.email}</p>{/if}
  </header>

  {#if error}
    <p class="rounded-lg border-2 border-red-700 p-4 text-lg text-red-800" role="alert">{error}</p>
  {/if}

  <h2 class="mb-3 text-xl font-semibold">Field</h2>
  <a
    href="#/field"
    class="mb-6 flex min-h-14 items-center justify-between gap-3 rounded-xl border-2 border-slate-900 px-4 text-xl font-semibold active:bg-slate-100"
  >
    <span>Today's route</span><span class="text-sm font-normal text-slate-600">sample data</span>
  </a>

  <h2 class="mb-3 text-xl font-semibold">Boards</h2>
  <ul class="space-y-3">
    {#each boards as board (board.slug)}
      <li>
        <a
          href={board.url}
          class="flex min-h-14 items-center justify-between gap-3 rounded-xl border-2 border-slate-900 px-4 text-xl font-semibold active:bg-slate-100"
        >
          <span>{board.title}</span>
          {#if board.access === 'owner'}<span class="text-sm font-normal text-slate-600">owners only</span>{/if}
        </a>
        {#if me?.isOwner}
          <label class="mt-1 flex min-h-12 cursor-pointer items-center gap-2 text-base text-slate-700">
            <span class="underline">Import data from an export file</span>
            <input type="file" accept="application/json,.json" class="sr-only" onchange={(e) => importFile(board, e.currentTarget)} />
          </label>
          {#if importNote[board.slug]}<p class="text-base text-slate-700" role="status">{importNote[board.slug]}</p>{/if}
        {/if}
      </li>
    {/each}
  </ul>
</main>
{/if}
