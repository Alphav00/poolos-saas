<script lang="ts">
  // One Componentia (React) component inside a Svelte screen. The root is made
  // once on mount, re-rendered with the new props when they change (never
  // remounted, so React keeps its state), and unmounted with the island.
  // Callbacks pass through as props (onClick, onChange...).
  import { createElement } from 'react'
  import { createRoot, type Root } from 'react-dom/client'
  import { component } from './componentia'

  let { name, props = {} }: { name: string; props?: Record<string, unknown> } = $props()

  let host = $state<HTMLElement>()
  let root = $state.raw<Root | null>(null)

  $effect(() => {
    if (!host) return
    const r = createRoot(host)
    root = r
    return () => {
      root = null
      // React refuses a synchronous unmount while it is rendering; defer it.
      queueMicrotask(() => r.unmount())
    }
  })

  $effect(() => {
    const Comp = component(name)
    if (!root) return
    if (!Comp) throw new Error(`Componentia has no ${name}`)
    root.render(createElement(Comp, props))
  })
</script>

<span class="island" bind:this={host}></span>

<style>
  .island { display: contents; }
</style>
