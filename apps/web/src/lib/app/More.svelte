<script lang="ts">
  type Board = { slug: string; title: string; url: string; access: 'owner' | 'team' }

  let { email, isOwner, boards }: { email: string; isOwner: boolean; boards: Board[] } = $props()
  let importNote = $state<Record<string, string>>({})

  async function importFile(board: Board, input: HTMLInputElement) {
    const file = input.files?.[0]
    if (!file) return
    importNote[board.slug] = 'Importing…'
    try {
      const res = await fetch(`/api/boards/${board.slug}/_import`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: await file.text() })
      const out = await res.json()
      if (!res.ok) throw new Error(out.error?.message ?? 'Import failed')
      importNote[board.slug] = `Imported ${out.imported} documents.`
    } catch (e) {
      importNote[board.slug] = e instanceof Error ? e.message : 'Import failed'
    } finally {
      input.value = ''
    }
  }
</script>

<div class="bar"><span class="t">More</span><span class="xs">{email}</span></div>

<section class="card" style="margin-top:0">
  <h2 class="h">Tools</h2>
  <a class="stop" href="/measure">
    <span class="num">📏</span>
    <div><div class="nm">Measure</div><div class="xs">Liners and covers: A/B walk, closure checks, order forms</div></div>
    <span></span>
  </a>
  <a class="stop" href="#/more/chemistry">
    <span class="num">⚗</span>
    <div><div class="nm">Chemistry setup</div><div class="xs">Products with their label strengths, and the company's target ranges</div></div>
    <span></span>
  </a>
</section>

<section class="card">
  <h2 class="h">Boards</h2>
  {#each boards as board (board.slug)}
    <a class="stop" href={board.url}>
      <span class="num">▸</span>
      <div class="nm">{board.title}</div>
      {#if board.access === 'owner'}<span class="xs">owners only</span>{:else}<span></span>{/if}
    </a>
    {#if isOwner}
      <label class="imp">
        <span>Import an export file into {board.title}</span>
        <input type="file" accept="application/json,.json" class="sr-only" onchange={(e) => importFile(board, e.currentTarget)} />
      </label>
      {#if importNote[board.slug]}<p class="xs" role="status">{importNote[board.slug]}</p>{/if}
    {/if}
  {/each}
</section>

<style>
  .imp { display: flex; align-items: center; min-height: 44px; font-size: 13px; color: #0a6f9e; text-decoration: underline; cursor: pointer; padding-left: 32px; }
</style>
