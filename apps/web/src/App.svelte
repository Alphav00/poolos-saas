<script lang="ts">
  import Home from './lib/app/Home.svelte'
  import More from './lib/app/More.svelte'
  import TabBar from './lib/app/TabBar.svelte'
  import './lib/app/app.css'
  import Field from './lib/field/Field.svelte'

  type Board = { slug: string; title: string; url: string; access: 'owner' | 'team' }
  type Me = { email: string; isOwner: boolean }

  let me = $state<Me | null>(null)
  let boards = $state<Board[]>([])
  let error = $state('')

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
  load()

  let hash = $state(location.hash)
  const route = $derived(hash.replace(/^#\/?/, '').split('/').filter(Boolean))
  const tab = $derived(route[0] === 'field' ? 'route' : route[0] === 'more' ? 'more' : route.length === 0 ? 'today' : 'none')

  let screen = $state<HTMLElement>()
  // Each new screen starts at the top, like an app, not mid-scroll from the last one.
  $effect(() => {
    void hash
    screen?.scrollTo(0, 0)
  })
</script>

<svelte:window onhashchange={() => (hash = location.hash)} />

<main class="field" bind:this={screen}>
  <div class="wrap">
    {#if error}<p class="alert" role="alert"><b>{error}</b></p>{/if}
    {#if route[0] === 'field'}
      <Field path={route} />
    {:else if route[0] === 'more'}
      <More email={me?.email ?? ''} isOwner={me?.isOwner ?? false} {boards} />
    {:else}
      <Home email={me?.email ?? ''} />
    {/if}
  </div>
  {#if route[2] !== 'readings'}<TabBar current={tab} />{/if}
</main>
