<script>
  import { Router, Route } from 'svelte-routing';
  import JobsList from './routes/JobsList.svelte';
  import JobEditor from './routes/JobEditor.svelte';
  import JobView from './routes/JobView.svelte';
  import FixturesLoader from './routes/FixturesLoader.svelte';
  import defaultBrand, { brands } from 'virtual:brand';

  // With several brand packs, the web app's placeholder sign-in picked one;
  // wear the same here (see apps/web/src/lib/app/account.svelte.ts).
  let saved = null;
  try { saved = localStorage.getItem('poolos.account'); } catch { /* blocked storage */ }
  const brand = (brands.length > 1 && brands.find((b) => b.id === saved)) || defaultBrand;
  if (brands.length > 1) document.documentElement.dataset.brand = brand.id;

  let url = '';
</script>

<Router url="{url}">
  <header class="sticky top-0 z-10 bg-ink-950/90 backdrop-blur">
    <div class="max-w-3xl mx-auto px-4 py-2 flex items-center justify-between gap-2">
      <a href="/" class="flex items-center gap-2 min-w-0" title="Back to {brand.shortName}">
        <img src={brand.mark} alt="" class="w-10 h-10 object-contain" />
        <span class="leading-tight">
          <span class="block text-lg font-bold">Measure</span>
          <span class="block text-xs text-ink-100/80 font-semibold whitespace-nowrap">‹ {brand.shortName}</span>
        </span>
      </a>
      <nav class="flex gap-2 text-sm">
        <a href="/measure" class="btn-ghost text-sm py-2 px-4 whitespace-nowrap">Jobs</a>
        <a href="/measure/new" class="btn text-sm py-2 px-4 whitespace-nowrap">+ New</a>
      </nav>
    </div>
  </header>

  <main class="max-w-3xl mx-auto px-4 py-4">
    <Route path="/measure" component="{JobsList}" />
    <Route path="/measure/new" component="{JobEditor}" />
    <Route path="/measure/jobs/:id" let:params><JobView id={params.id} /></Route>
    <Route path="/measure/jobs/:id/edit" let:params><JobEditor id={params.id} /></Route>
    <Route path="/measure/fixtures" component="{FixturesLoader}" />
  </main>
</Router>
