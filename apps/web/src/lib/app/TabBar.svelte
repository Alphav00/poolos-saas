<script lang="ts">
  let { current }: { current: 'today' | 'route' | 'messages' | 'more' } = $props()
  const tabs = [
    { key: 'today', href: '#/', icon: '🏠', label: 'Today' },
    { key: 'route', href: '#/field', icon: '🗺️', label: 'Route' },
    { key: 'messages', href: '#/messages', icon: '💬', label: 'Messages' },
    { key: 'more', href: '#/more', icon: '☰', label: 'More' },
  ]
</script>

<nav class="tabbar" aria-label="Main">
  {#each tabs as t (t.key)}
    <a href={t.href} aria-current={t.key === current ? 'page' : undefined}>
      <span class="ti" aria-hidden="true">{t.icon}</span><span>{t.label}</span>
    </a>
  {/each}
</nav>
