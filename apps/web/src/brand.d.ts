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
    logo: string
    mark: string
  }
  export default brand
}
