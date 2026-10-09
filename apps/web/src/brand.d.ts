/** The brand pack chosen at build time (BRAND=<folder>; see brands/README.md). */
declare module 'virtual:brand' {
  const brand: {
    id: string
    name: string
    shortName: string
    legalName: string
    tagline: string
    /** A company trying the app before it is theirs: shows the tester strip and the problem form up front. */
    pilot: boolean
    /** Where testers file problems in Linear under their own sign-in; null shows no Linear button. */
    linear: { team: string; project?: string; labels: string[] } | null
    logo: string
    mark: string
  }
  export default brand
}
