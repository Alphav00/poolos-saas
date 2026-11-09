<script lang="ts">
  // Componentia's TabBar look (app.css .tabbar), kept as Svelte links rather
  // than the React island: its tabs are buttons in a tablist, and these must
  // route by hash, open in a new tab, and stay "navigation Main" with
  // aria-current for the journeys (DECISIONS d0039). The library uses no
  // emoji or icon set, so each tab shows its marker square.
  let { current }: { current: 'today' | 'route' | 'messages' | 'more' } = $props()
  const tabs = [
    { key: 'today', href: '#/', label: 'Today' },
    { key: 'route', href: '#/field', label: 'Route' },
    { key: 'messages', href: '#/messages', label: 'Messages' },
    { key: 'more', href: '#/more', label: 'More' },
  ]
</script>

<nav class="tabbar" aria-label="Main">
  {#each tabs as t (t.key)}
    <a href={t.href} aria-current={t.key === current ? 'page' : undefined}>
      <span class="ti" aria-hidden="true"></span><span>{t.label}</span>
    </a>
  {/each}
</nav>
