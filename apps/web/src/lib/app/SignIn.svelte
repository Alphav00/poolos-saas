<script lang="ts">
  import { brands } from 'virtual:brand'
  import { signIn } from './account.svelte'

  let username = $state('')
  let error = $state('')

  function submit(e: SubmitEvent) {
    e.preventDefault()
    error = signIn(username) ? '' : `No account called "${username.trim()}".`
  }
</script>

<section class="card signin">
  <h1 class="t">Sign in</h1>
  <form onsubmit={submit}>
    <label class="fl"><span class="h">Username</span>
      <input bind:value={username} autocomplete="username" autocapitalize="none" spellcheck="false" required />
    </label>
    {#if error}<p class="alert" role="alert"><b>{error}</b></p>{/if}
    <button class="btn" type="submit">Sign in</button>
  </form>
  <p class="xs hint">Placeholder accounts for now, one per company: {brands.map((b) => b.id).join(', ')}</p>
</section>

<style>
  .signin { margin-top: 24px; }
  .t { font-size: 22px; font-weight: 900; margin: 0 0 4px; color: var(--ink); }
  .fl { display: block; margin-top: 12px; }
  .fl input { display: block; width: 100%; margin-top: 6px; font: inherit; font-size: 16px; font-weight: 700; color: var(--ink); border: 2px solid var(--line); border-radius: 12px; padding: 10px; min-height: 44px; background: #fff; }
  .fl input:focus { outline: none; border-color: var(--brand-primary); }
  .hint { margin-top: 12px; }
</style>
