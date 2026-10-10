/** The brand packs chosen at build time (BRAND=<folder>[,<folder>]; see brands/README.md). */
declare module 'virtual:brand' {
  export type Brand = {
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
  /** The default pack: the first in BRAND. */
  const brand: Brand
  /** Every pack in the build, default first. More than one turns on the placeholder sign-in. */
  export const brands: Brand[]
  export default brand
}
