<script lang="ts">
  import ChemSetup from './lib/app/ChemSetup.svelte'
  import BrandLoader from './lib/app/BrandLoader.svelte'
  import Home from './lib/app/Home.svelte'
  import Messages from './lib/app/Messages.svelte'
  import More from './lib/app/More.svelte'
  import Report from './lib/app/Report.svelte'
  import SignIn from './lib/app/SignIn.svelte'
  import Staff from './lib/app/Staff.svelte'
  import TabBar from './lib/app/TabBar.svelte'
  import { brand, signedIn } from './lib/app/account.svelte'
  import './lib/app/app.css'
  import Field from './lib/field/Field.svelte'

  type Board = { slug: string; title: string; url: string; access: 'owner' | 'team' }
  // role comes from the staff record matching the sign-in email; canEditPools
  // is what the Worker enforces on pool writes (owners, Leads, Dispatchers).
  type Me = { email: string; isOwner: boolean; role: string | null; canEditPools: boolean }

  let me = $state<Me | null>(null)
  let boards = $state<Board[]>([])
  let error = $state('')
  // The company's loading screen, while the first load runs after sign-in.
  let loader = $state<{ balls: string[]; word: string } | null>(null)
  let loaded = $state(false)

  async function load() {
    try {
      const [m, b] = await Promise.all([fetch('/api/me'), fetch('/api/boards')])
      if (!m.ok || !b.ok) throw new Error(m.status === 401 ? 'Sign in again.' : `Could not load ${brand().shortName}.`)
      me = await m.json()
      boards = (await b.json()).boards
    } catch (e) {
      error = e instanceof Error ? e.message : `Could not load ${brand().shortName}.`
    } finally {
      loaded = true
    }
  }

  // Loads once signed in (at once when the build has a single brand), and
  // again after signing out and back in.
  let started = false
  $effect(() => {
    if (!signedIn()) {
      started = false
      return
    }
    if (started) return
    started = true
    loaded = false
    error = ''
    loader = brand().loader
    load()
  })

  const KNOWN = ['field', 'messages', 'more']
  // Unknown links land on Today rather than a screen with no tab lit.
  if (location.hash.length > 2 && !KNOWN.includes(location.hash.replace(/^#\/?/, '').split('/')[0]!)) history.replaceState(null, '', '#/')

  let hash = $state(location.hash)
  // The screen a problem report is about: the last one seen before the form.
  let lastScreen = $state('')
  const route = $derived(hash.replace(/^#\/?/, '').split('/').filter(Boolean))
  const tab = $derived(route[0] === 'field' ? 'route' : route[0] === 'messages' ? 'messages' : route[0] === 'more' ? 'more' : 'today')
  const entering = $derived(route[0] === 'field' && route[2] === 'readings')

  let screen = $state<HTMLElement>()
  // Each new screen starts at the top, like an app, not mid-scroll from the last one.
  $effect(() => {
    void hash
    screen?.scrollTo(0, 0)
  })
</script>

<svelte:window
  onhashchange={() => {
    if (location.hash.length > 2 && !KNOWN.includes(location.hash.replace(/^#\/?/, '').split('/')[0]!)) history.replaceState(null, '', '#/')
    if (!/^#\/more\/report/.test(hash)) lastScreen = hash || '#/'
    hash = location.hash
  }}
/>

{#if loader}<BrandLoader balls={loader.balls} word={loader.word} done={loaded} onfinish={() => (loader = null)} />{/if}

{#if !signedIn()}
<main class="field no-tabs"><div class="wrap"><SignIn /></div></main>
{:else}
<main class={['field', entering && 'no-tabs']} bind:this={screen}>
  <div class="wrap">
    {#if error}<p class="alert" role="alert"><b>{error}</b>{#if error === 'Sign in again.'} <a href="/">Sign in</a>{/if}</p>{/if}
    {#if route[0] === 'field'}
      <Field path={route} isOwner={me?.isOwner ?? false} />
    {:else if route[0] === 'messages'}
      <Messages email={me?.email ?? ''} isOwner={me?.isOwner ?? false} />
    {:else if route[0] === 'more' && route[1] === 'report'}
      <Report from={lastScreen} />
    {:else if route[0] === 'more' && route[1] === 'staff'}
      <Staff isOwner={me?.isOwner ?? false} />
    {:else if route[0] === 'more' && route[1] === 'chemistry'}
      <ChemSetup />
    {:else if route[0] === 'more'}
      <More email={me?.email ?? ''} isOwner={me?.isOwner ?? false} role={me?.role ?? null} {boards} />
    {:else}
      <Home email={me?.email ?? ''} isOwner={me?.isOwner ?? false} />
    {/if}
  </div>
  {#if !entering}<TabBar current={tab} />{/if}
</main>
{/if}
