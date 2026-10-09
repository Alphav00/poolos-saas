<script lang="ts">
  import { untrack } from 'svelte'
  // "Report a problem": what a tester saw, saved on the feedback board. The
  // Worker stamps who sent it and, when Linear is set up, opens it there too.
  let { from = '' }: { from?: string } = $props()

  type Report = {
    area: string
    severity: string
    device: string
    title: string
    expected?: string
    actual: string
    steps?: string
    screen?: string
    reporter?: string
    reportedAt?: string
    linear?: string
    linearUrl?: string
    status?: string
  }

  const AREAS = [
    ['dispatch', 'Dispatch'],
    ['route', 'Route View'],
    ['field', 'Tech Field Portal'],
    ['chemistry', 'Chemical Logger'],
    ['measure', 'Measure'],
    ['invoicing', 'Invoicing'],
    ['other', 'Other'],
  ] as const
  const SEVERITIES = [
    ['blocker', 'Blocker', 'Stops the work'],
    ['major', 'Major', 'Wrong result or a hard workaround'],
    ['minor', 'Minor', 'Annoying, has a workaround'],
    ['idea', 'Idea', 'A wish or a suggestion'],
  ] as const
  const DEVICES = [
    ['phone', 'Phone'],
    ['tablet', 'Tablet'],
    ['desktop', 'Computer'],
  ] as const
  const areaName = (k: string) => AREAS.find((a) => a[0] === k)?.[1] ?? k

  // Best guess at what this screen is; the tester can change it.
  const guessDevice = () => (innerWidth < 600 ? 'phone' : innerWidth < 1024 ? 'tablet' : 'desktop')
  const guessArea = (h: string) => (h.startsWith('#/field/') && h.endsWith('/readings') ? 'chemistry' : h.startsWith('#/field/') ? 'field' : h.startsWith('#/field') ? 'route' : h.includes('chemistry') ? 'chemistry' : '')

  // Guessed once from the screen the form was opened from.
  let area = $state(untrack(() => guessArea(from)))
  let severity = $state('')
  let device = $state(guessDevice())
  let title = $state('')
  let expected = $state('')
  let actual = $state('')
  let steps = $state('')
  let sending = $state(false)
  let note = $state('')
  let sent = $state<Report | null>(null)
  let reports = $state<{ id: string; data: Report }[]>([])
  let listNote = $state('Loading…')

  const ready = $derived(area && severity && device && title.trim() && actual.trim())

  async function loadReports() {
    try {
      const res = await fetch('/api/boards/feedback/reports')
      if (!res.ok) throw new Error()
      const out = (await res.json()) as { docs: { id: string; data: Report }[] }
      reports = out.docs.reverse()
      listNote = ''
    } catch {
      listNote = 'Could not load the reports. Pull down or reopen to try again.'
    }
  }
  loadReports()

  function newId() {
    const iso = new Date().toISOString()
    const rand = Math.random().toString(36).slice(2, 6).padEnd(4, '0')
    return `r-${iso.slice(0, 10).replaceAll('-', '')}-${iso.slice(11, 19).replaceAll(':', '')}-${rand}`
  }

  async function send() {
    if (!ready || sending) return
    sending = true
    note = ''
    const data: Report = { area, severity, device, title: title.trim(), actual: actual.trim() }
    if (expected.trim()) data.expected = expected.trim()
    if (steps.trim()) data.steps = steps.trim()
    if (from) data.screen = from.slice(0, 200)
    try {
      const res = await fetch(`/api/boards/feedback/reports/${newId()}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { ...data, userAgent: navigator.userAgent.slice(0, 300) } }),
      })
      const out = await res.json()
      if (!res.ok) throw new Error(out.error?.message ?? 'Could not send the report')
      sent = out.data as Report
      title = expected = actual = steps = ''
      severity = ''
      loadReports()
    } catch (e) {
      note = e instanceof Error ? e.message : 'Could not send the report'
    } finally {
      sending = false
    }
  }

  function another() {
    sent = null
    note = ''
  }
</script>

<div class="bar"><a class="back" href="#/more">‹ More</a><span class="t">Report a problem</span></div>

{#if sent}
  <section class="card done" style="margin-top:0" role="status">
    <div class="big">Thanks, got it.</div>
    <p class="sm" style="margin-top:6px">
      {#if sent.linear}Filed as <a href={sent.linearUrl} target="_blank" rel="noopener">{sent.linear}</a> in Linear.{:else}Saved. It will be added to the Linear list.{/if}
    </p>
    <button class="btn" onclick={another}>Report something else</button>
    <a class="btn ghost" href={from || '#/'}>Back to where I was</a>
  </section>
{:else}
  <section class="card" style="margin-top:0">
    <p class="sm">Something wrong, confusing, or missing? Say what you did and what happened. Short is fine.</p>

    <h2 class="h" style="margin-top:12px">Which part of the app?</h2>
    <div class="pick">
      {#each AREAS as [k, label] (k)}
        <button type="button" aria-pressed={area === k} onclick={() => (area = k)}>{label}</button>
      {/each}
    </div>

    <h2 class="h" style="margin-top:12px">How bad is it?</h2>
    <div class="pick sev">
      {#each SEVERITIES as [k, label, hint] (k)}
        <button type="button" class={k} aria-pressed={severity === k} onclick={() => (severity = k)}><b>{label}</b><span>{hint}</span></button>
      {/each}
    </div>

    <h2 class="h" style="margin-top:12px">On what?</h2>
    <div class="seg">
      {#each DEVICES as [k, label] (k)}
        <button type="button" aria-pressed={device === k} onclick={() => (device = k)}>{label}</button>
      {/each}
    </div>

    <label class="fl"><span class="h">In a few words</span>
      <input bind:value={title} maxlength="120" placeholder="e.g. Next stop shows the wrong pool" />
    </label>
    <label class="fl"><span class="h">What happened</span>
      <textarea bind:value={actual} maxlength="2000" rows="3" placeholder="e.g. After stop 4 it jumped to stop 7"></textarea>
    </label>
    <label class="fl"><span class="h">What you expected <i>(optional)</i></span>
      <textarea bind:value={expected} maxlength="2000" rows="2" placeholder="e.g. Stop 5, the next house on the street"></textarea>
    </label>
    <label class="fl"><span class="h">How to make it happen again <i>(optional)</i></span>
      <textarea bind:value={steps} maxlength="2000" rows="2" placeholder="e.g. Route tab → tap stop 4 → Done"></textarea>
    </label>
    {#if from}<p class="xs" style="margin-top:6px">Screen: {from}</p>{/if}

    <button class="btn" disabled={!ready || sending} onclick={send}>{sending ? 'Sending…' : 'Send report'}</button>
    {#if !ready}<p class="xs" style="margin-top:6px;text-align:center">Pick a part, how bad, and fill in the first two boxes.</p>{/if}
    {#if note}<p class="alert" role="alert"><b>{note}</b></p>{/if}
  </section>
{/if}

<section class="card">
  <div class="row"><h2 class="h">Reports so far</h2><span class="xs">{reports.length}</span></div>
  {#if listNote}<p class="xs" style="margin-top:6px">{listNote}</p>
  {:else if reports.length === 0}<p class="sm" style="margin-top:6px">No problems reported yet.</p>{/if}
  {#each reports as r (r.id)}
    <div class="rep">
      <div class="row" style="justify-content:flex-start;gap:6px;flex-wrap:wrap">
        <span class={['pp', r.data.severity === 'blocker' ? 'bad' : r.data.severity === 'major' ? 'warn' : '']}>{r.data.severity}</span>
        <span class="pp">{areaName(r.data.area)}</span>
        {#if r.data.linear}<a class="pp lin" href={r.data.linearUrl} target="_blank" rel="noopener">{r.data.linear}</a>{/if}
      </div>
      <div class="nm" style="margin-top:3px">{r.data.title}</div>
      <div class="xs">{r.data.reporter} · {r.data.reportedAt ? new Date(r.data.reportedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''}</div>
    </div>
  {/each}
</section>

<style>
  .pick { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; margin-top: 8px; }
  .pick button { font: inherit; font-weight: 800; font-size: 14px; min-height: 48px; border: 2px solid var(--line); background: #fff; color: var(--ink); border-radius: 14px; padding: 6px 8px; cursor: pointer; text-align: left; }
  .pick button[aria-pressed='true'] { border-color: var(--brand-primary); background: var(--brand-ice); color: var(--brand-deep); }
  .sev button { display: flex; flex-direction: column; gap: 1px; }
  .sev button span { font-size: 12px; font-weight: 700; color: var(--mute); }
  .sev button.blocker[aria-pressed='true'] { border-color: #e5484d; background: var(--badbg); color: #9b2328; }
  .sev button.major[aria-pressed='true'] { border-color: #f39c12; background: var(--warnbg); color: #7a4a06; }
  .fl { display: block; margin-top: 12px; }
  .fl i { font-style: normal; text-transform: none; letter-spacing: 0; font-weight: 700; }
  .fl input, .fl textarea { display: block; width: 100%; margin-top: 6px; font: inherit; font-size: 16px; font-weight: 700; color: var(--ink); border: 2px solid var(--line); border-radius: 12px; padding: 10px; background: #fff; resize: vertical; }
  .fl input:focus, .fl textarea:focus { outline: none; border-color: var(--brand-primary); }
  .fl ::placeholder { color: #8a9aa8; font-weight: 600; }
  .done .btn.ghost { margin-top: 8px; text-decoration: none; }
  .done a { color: var(--brand-link); font-weight: 900; }
  .rep { padding: 8px 0; border-top: 1px solid var(--line); }
  .rep:first-of-type { border-top: 0; }
  .lin { background: var(--brand-ice); color: var(--brand-link); text-decoration: none; }
</style>
