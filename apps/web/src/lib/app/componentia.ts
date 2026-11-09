// Loads the Componentia Cybernetical library (DECISIONS d0039): React on
// window first, then the bundle, its component classes and the colour roles.
// Fonts are the ones the three shipped themes name (bundle.css --cz-fd/fs/fm),
// Latin only: every screen is in English.
import './react-global'
import '../../vendor/componentia/bundle.js'
import '../../vendor/componentia/bundle.css'
import '../../vendor/componentia/tokens.css'
import '@fontsource/nunito/latin-400.css'
import '@fontsource/nunito/latin-600.css'
import '@fontsource/nunito/latin-700.css'
import '@fontsource/nunito/latin-800.css'
import '@fontsource/poppins/latin-400.css'
import '@fontsource/poppins/latin-500.css'
import '@fontsource/poppins/latin-600.css'
import '@fontsource/poppins/latin-700.css'
import '@fontsource/poppins/latin-800.css'
import '@fontsource/rye/latin-400.css'
import '@fontsource/courier-prime/latin-400.css'
import '@fontsource/courier-prime/latin-700.css'

/** A Componentia component by name, or undefined when the bundle has none by that name. */
export function component(name: string) {
  return window.Componentia?.[name]
}
