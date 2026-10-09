import { describe, expect, it } from 'vitest'
import { linearDescription, newIssueUrl } from './linear'

const REPORT = {
  area: 'route',
  severity: 'major',
  device: 'phone',
  title: 'Next stop shows the wrong pool',
  actual: 'It jumped to stop 7',
  expected: 'Stop 5 after stop 4',
  screen: '#/field',
  reporter: 'tester@example.test',
  reportedAt: '2026-10-09T14:22:33.000Z',
}
const TARGET = { team: 'HEP', project: 'Test drive', labels: ['Tester report', 'Phone'] }

describe('filing a report in Linear', () => {
  it('opens the team new-issue page with the report filled in', () => {
    const url = new URL(newIssueUrl(TARGET, REPORT)!)
    expect(url.origin + url.pathname).toBe('https://linear.app/team/HEP/new')
    expect(url.searchParams.get('title')).toBe('[Route View] Next stop shows the wrong pool')
    expect(url.searchParams.get('priority')).toBe('high')
    expect(url.searchParams.get('project')).toBe('Test drive')
    expect(url.searchParams.get('labels')).toBe('Tester report,Phone')
    expect(url.searchParams.get('description')).toContain('**Expected:** Stop 5 after stop 4')
  })

  it('maps every severity to a Linear priority', () => {
    const p = (severity: string) => new URL(newIssueUrl(TARGET, { ...REPORT, severity })!).searchParams.get('priority')
    expect([p('blocker'), p('major'), p('minor'), p('idea')]).toEqual(['urgent', 'high', 'medium', 'low'])
  })

  it('leaves out what the brand does not set', () => {
    const url = new URL(newIssueUrl({ team: 'HEP', labels: [] }, REPORT)!)
    expect(url.searchParams.has('project')).toBe(false)
    expect(url.searchParams.has('labels')).toBe(false)
  })

  it('offers nothing without a Linear team, or with one that is not a team key', () => {
    expect(newIssueUrl(null, REPORT)).toBeNull()
    expect(newIssueUrl({ team: 'x/../evil', labels: [] }, REPORT)).toBeNull()
  })

  it('keeps a long report to a link browsers accept', () => {
    const url = newIssueUrl(TARGET, { ...REPORT, actual: 'é'.repeat(2000), steps: 'x'.repeat(2000), expected: 'y'.repeat(2000) })!
    expect(url.startsWith('https://linear.app/')).toBe(true)
    expect(new URL(url).searchParams.get('description')!.length).toBeLessThanOrEqual(4000)
    expect(url.length).toBeLessThan(16000)
  })

  it('writes the description in the team template order', () => {
    const md = linearDescription(REPORT)
    expect(md.indexOf('Feature area')).toBeLessThan(md.indexOf('Severity'))
    expect(md.indexOf('Expected')).toBeLessThan(md.indexOf('Actual'))
    expect(md).toContain('Saved in the app by tester@example.test')
  })
})
