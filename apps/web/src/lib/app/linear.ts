// Filing a problem report in Linear under the tester's own sign-in. The Worker
// never talks to Linear; the app opens Linear's new-issue page with the report
// filled in (linear.app/team/<KEY>/new?title=…), and the tester taps Create.

export type LinearTarget = { team: string; project?: string; labels: string[] }
export type ReportFields = {
  area: string
  severity: string
  device: string
  title: string
  actual: string
  expected?: string
  steps?: string
  screen?: string
  reporter?: string
  reportedAt?: string
}

export const AREA_NAMES: Record<string, string> = {
  dispatch: 'Dispatch',
  route: 'Route View',
  field: 'Tech Field Portal',
  chemistry: 'Chemical Logger',
  measure: 'Measure',
  invoicing: 'Invoicing',
  other: 'Other',
}
const SEVERITY: Record<string, { label: string; priority: string }> = {
  blocker: { label: 'Blocker: stops the work', priority: 'urgent' },
  major: { label: 'Major: wrong result or a hard workaround', priority: 'high' },
  minor: { label: 'Minor: annoying, has a workaround', priority: 'medium' },
  idea: { label: 'Idea or wish', priority: 'low' },
}
const DEVICE_NAMES: Record<string, string> = { phone: 'Phone', tablet: 'Tablet', desktop: 'Computer' }

/** Long reports are cut so the whole link stays well inside what browsers and Linear accept. */
const MAX_DESCRIPTION = 4000

/** The issue body, in the order of the team's report template. */
export function linearDescription(r: ReportFields): string {
  const line = (label: string, v?: string) => (v?.trim() ? `**${label}:** ${v.trim()}\n\n` : '')
  return (
    line('Feature area', AREA_NAMES[r.area] ?? r.area) +
    line('Severity', SEVERITY[r.severity]?.label ?? r.severity) +
    line('Device / viewport', DEVICE_NAMES[r.device] ?? r.device) +
    line('Screen', r.screen) +
    line('Expected', r.expected) +
    line('Actual', r.actual) +
    line('Steps to repeat', r.steps) +
    `---\nSaved in the app${r.reporter ? ` by ${r.reporter}` : ''}${r.reportedAt ? ` at ${r.reportedAt}` : ''}.`
  )
}

/** Linear's new-issue page with the report filled in, or null when the brand has no Linear team. */
export function newIssueUrl(target: LinearTarget | null, r: ReportFields): string | null {
  if (!target || !/^[A-Z][A-Z0-9]{0,9}$/.test(target.team)) return null
  let description = linearDescription(r)
  if (description.length > MAX_DESCRIPTION) description = description.slice(0, MAX_DESCRIPTION - 1) + '…'
  const q = new URLSearchParams({ title: `[${AREA_NAMES[r.area] ?? r.area}] ${r.title.trim()}`, description })
  const priority = SEVERITY[r.severity]?.priority
  if (priority) q.set('priority', priority)
  if (target.project) q.set('project', target.project)
  if (target.labels.length) q.set('labels', target.labels.join(','))
  return `https://linear.app/team/${target.team}/new?${q}`
}
