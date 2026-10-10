<script lang="ts">
  // Staff on file. Owners add and remove people; everyone else sees the list.
  // A person's role is matched to their sign-in email: Leads and Dispatchers
  // may change pool profiles, Technicians and Operators read them.
  import { deleteStaff, initials, loadDemoStaff, loadStaff, POOL_EDITORS, ROLES, saveStaff, staffId, takenIds } from '../field/staff'
  import type { Role, StaffMember } from '../field/types'

  let { isOwner }: { isOwner: boolean } = $props()

  let staff = $state<StaffMember[] | null>(null)
  let error = $state('')
  let note = $state('')
  let busy = $state(false)

  let name = $state('')
  let email = $state('')
  let role = $state<Role>('Technician')
  let route = $state('')


  async function load(fresh = false) {
    error = ''
    try {
      staff = await loadStaff(fresh)
    } catch (e) {
      error = e instanceof Error ? e.message : 'Could not load the staff list.'
    }
  }
  load()

  async function run(job: () => Promise<void>, done: string) {
    busy = true
    note = ''
    try {
      await job()
      note = done
    } catch (e) {
      note = e instanceof Error ? e.message : 'Something went wrong.'
    } finally {
      busy = false
    }
  }

  const demo = () => run(async () => { staff = await loadDemoStaff() }, 'Demo staff loaded.')

  function add(e: SubmitEvent) {
    e.preventDefault()
    const person: StaffMember = { id: staffId(name, takenIds), name: name.trim(), email: email.trim().toLowerCase(), role }
    if (route.trim()) person.route = route.trim()
    run(async () => {
      await saveStaff(person)
      staff = await loadStaff(true)
      name = email = route = ''
      role = 'Technician'
    }, `${person.name} added.`)
  }

  function remove(s: StaffMember) {
    if (!confirm(`Remove ${s.name} from staff?`)) return
    run(async () => {
      await deleteStaff(s.id)
      staff = await loadStaff(true)
    }, `${s.name} removed.`)
  }
</script>

<div class="bar"><a class="back" href="#/more">‹ More</a><span class="xs">staff</span></div>

<section class="card" style="margin-top:0">
  <h2 class="h">Staff</h2>
  <p class="xs" style="margin-top:2px">Leads and Dispatchers can change pool profiles. Technicians and Operators can read them. {isOwner ? 'Only owners add or remove staff.' : 'Ask an owner to add or change someone.'}</p>
  {#if error}
    <p class="alert" role="alert"><b>{error}</b></p>
    <button class="btn ghost" onclick={() => load(true)}>Try again</button>
  {:else if staff === null}
    <p class="sm" style="margin-top:8px">Loading staff…</p>
  {:else if staff.length === 0}
    <p class="sm" style="margin-top:8px">No staff on file yet.</p>
    {#if isOwner}
      <button class="btn ghost" onclick={demo} disabled={busy}>{busy ? 'Loading…' : 'Load demo staff'}</button>
      <p class="xs" style="margin-top:6px;text-align:center">Five made-up people, marked DEMO, so the screens can be tried.</p>
    {/if}
  {:else}
    <ul class="people">
      {#each staff as s (s.id)}
        <li class="stop">
          <span class="num" aria-hidden="true">{initials(s.name)}</span>
          <div style="min-width:0">
            <div class="nm">{s.name}{#if s.demo}<span class="sample">DEMO</span>{/if}</div>
            <div class="xs mail">{s.email}</div>
            <div class="pred">
              <span class={['chip', POOL_EDITORS.includes(s.role) && 'ok']}>{s.role}</span>
              {#if s.route}<span class="pp">{s.route}</span>{/if}
            </div>
          </div>
          {#if isOwner}
            <button class="chip bad" onclick={() => remove(s)} disabled={busy} aria-label={`Remove ${s.name}`}>Remove</button>
          {:else}<span></span>{/if}
        </li>
      {/each}
    </ul>
  {/if}
  {#if note}<p class="xs" role="status" style="margin-top:6px">{note}</p>{/if}
</section>

{#if isOwner && staff !== null && !error}
  <form class="card" onsubmit={add}>
    <h2 class="h">Add someone</h2>
    <label class="f">Name <input type="text" bind:value={name} maxlength="80" required autocomplete="off" /></label>
    <label class="f">Sign-in email <input type="email" bind:value={email} maxlength="120" required autocomplete="off" autocapitalize="off" /></label>
    <span class="f" id="role-label">Role</span>
    <div class="roles" role="group" aria-labelledby="role-label">
      {#each ROLES as r (r)}
        <button type="button" class="chip" aria-pressed={role === r} onclick={() => (role = r)}>{r}</button>
      {/each}
    </div>
    <label class="f">Route (optional) <input type="text" bind:value={route} maxlength="40" placeholder="Route A, Repairs, Office…" autocomplete="off" /></label>
    <button class="btn" type="submit" disabled={busy || !name.trim() || !email.trim()}>{busy ? 'Saving…' : 'Add to staff'}</button>
  </form>
{/if}

<style>
  .people { list-style: none; margin: 6px 0 0; padding: 0; }
  .people .num { font-size: 11px; }
  .people .pred { align-items: center; }
  .mail { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .f { display: block; font-size: 12px; color: var(--mute); margin-top: 8px; }
  .f input { display: block; width: 100%; font: inherit; font-size: 16px; font-weight: 700; border: 2px solid var(--line); border-radius: 10px; padding: 8px; color: var(--ink); margin-top: 2px; min-height: 48px; background: var(--card); }
  .roles { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; margin-top: 4px; }
  .roles .chip { justify-content: center; }
  .roles .chip[aria-pressed='true'] { background: var(--brand-primary); color: #fff; }
</style>
