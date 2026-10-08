// Salt (NaCl) ranges for chlorine generator cells, by make and model.
//
// Every row is taken from the manufacturer's own manual, and carries the
// document, its URL and a verbatim quote so the number can be checked. A make
// or model that is not here returns a question, never a guess (DESIGN.md §3
// #10). Add a row only with the document open.
import type { Answer, Question } from './pool';

export interface SaltCellRange {
  make: string;
  /** Model names as the manufacturer prints them; matching ignores case, spaces and dashes. */
  models: string[];
  minPpm: number;
  maxPpm: number;
  /** The "ideal" or "recommended" figure, when the document gives one. */
  idealPpm?: number;
  /** One sentence from the document containing the numbers. */
  quote: string;
  document: string;
  url: string;
  /** When the document was read. */
  checked: string;
}

// Rows read on 2026-10-08. Quotes are as printed; g/L figures are converted
// at 1 g/L = 1000 ppm. Where a maker's manuals differ by generation (Jandy,
// AutoPilot), each generation has its own row. Not on file, on purpose:
// Zodiac eXO (its manual gives a recommended level and a minimum but no
// maximum), Blue Works (no owner's manual published), Jandy PLC1400 (manual
// not reachable), and Hayward AquaRite S3's alarm defaults (the manual's
// stated operating window is used instead).
const HAYWARD_IDEAL = 'The ideal salt level is between 2700-3400 ppm (parts per million) with 3200 ppm being optimal.';
const CIRCUPOOL_IDEAL =
  'The ideal salt level for operation is about 3500 ppm (parts per million), and it is suggested to keep the salinity between 3000-4000 ppm.';

export const SALT_CELLS: readonly SaltCellRange[] = [
  {
    make: 'Hayward',
    models: ['AquaRite', 'AQR3', 'AQR9', 'AQR15', 'AQR15-LL', 'AQR15-120', 'T-CELL-3', 'T-CELL-9', 'T-CELL-15'],
    minPpm: 2700,
    maxPpm: 3400,
    idealPpm: 3200,
    quote: HAYWARD_IDEAL,
    document: "AquaRite Electronic Chlorine Generator Owner's Manual, 092538 RevD (2019)",
    url: 'https://hayward.com/media/akeneo_connector/asset_files/0/9/092538_RevD_b778.pdf',
    checked: '2026-10-08',
  },
  {
    make: 'Hayward',
    models: ['AquaRite 900', 'AQR940'],
    minPpm: 2700,
    maxPpm: 3400,
    idealPpm: 3200,
    quote: HAYWARD_IDEAL,
    document: "AquaRite 900 Series Electronic Chlorine Generator Owner's Manual, 092623 RevD (2019)",
    url: 'https://commerce.hayward-pool-assets.com/magento/akeneo/AQR940/manuals/092623RevD_c7b4.pdf',
    checked: '2026-10-08',
  },
  {
    make: 'Hayward',
    models: ['AquaRite S3', 'AQRS340', 'AQRS325', 'AQRS315'],
    minPpm: 1200,
    maxPpm: 8000,
    idealPpm: 3200,
    quote: 'The operating salt level is between 1200 PPM - 8000 PPM (parts per million) with 3200 PPM being optimal.',
    document: "AquaRite S3 Series Pool Chlorinator and Automation Control Owner's Manual, 092769 RevD (2022)",
    url: 'https://hayward.com/media/akeneo_connector/asset_files/0/9/092769_RevD_f825.pdf',
    checked: '2026-10-08',
  },
  {
    make: 'Hayward',
    models: ['Salt & Swim 3C', 'Salt and Swim 3C', 'SAS', 'W3SAS-CELL'],
    minPpm: 2700,
    maxPpm: 3400,
    idealPpm: 3200,
    quote: 'The ideal salt level is between 2.7 g/l (2700 ppm) - 3.4 g/l (3400 ppm) with 3.2 g/l (3200 ppm) being ideal.',
    document: "Salt & Swim 3C Owner's Manual, 092486 RevB (2011)",
    url: 'https://commerce.hayward-pool-assets.com/magento/akeneo/W3SAS-CELL/manuals/salt_and_swim_3c_owner_manual_canada_bilingual_0e70.pdf',
    checked: '2026-10-08',
  },
  {
    make: 'Hayward',
    models: ['AquaTrol', 'AQ-TROL-RJ', 'AQ-TROL-RJ-TL', 'AQ-TROL-HP', 'AQ-TROL-HP-TL'],
    minPpm: 2700,
    maxPpm: 3400,
    idealPpm: 3200,
    quote: HAYWARD_IDEAL,
    document: "AquaTrol Above Ground Pool Chlorine Generator Owner's Manual, 092016K RevO (2019)",
    url: 'https://commerce.hayward-pool-assets.com/magento/akeneo/AQ-TROL-HP/manuals/092016KRevO_c0a2.pdf',
    checked: '2026-10-08',
  },
  {
    make: 'Pentair',
    models: ['IntelliChlor', 'IC15', 'IC20', 'IC40', 'IC60'],
    minPpm: 3600,
    maxPpm: 4500,
    idealPpm: 3600,
    quote: 'Salt: 3600 - 4500 ppm (ideal 3600 ppm)',
    document: "IntelliChlor Salt Chlorine Generator IC15, IC20, IC40, IC60 Installation and User's Guide, P/N 520589 Rev. R (2023)",
    url: 'https://flowandfiltrationsolutions.pentair.com/content/dam/extranet/nam/pentair-pool/residential/sanitizers/intellichlor/intellichlor-installation-users-guide-ic15-ic20-ic40-ic60.pdf',
    checked: '2026-10-08',
  },
  {
    make: 'Pentair',
    models: ['iChlor', 'iChlor 15', 'iChlor 30'],
    minPpm: 3000,
    maxPpm: 4500,
    idealPpm: 3600,
    quote: 'Salt: 3000 - 4500 ppm (ideal 3600 ppm)',
    document: "iChlor Salt Chlorine Generator Installation and User's Guide, P/N 522709 Rev. G (2023)",
    url: 'https://www.pentair.com/content/dam/extranet/nam/pentair-pool/residential/sanitizers/ichlor/ichlor-manual-522709-english.pdf',
    checked: '2026-10-08',
  },
  {
    make: 'Jandy',
    models: ['AquaPure', 'APURE700', 'APURE1400'],
    minPpm: 3000,
    maxPpm: 3500,
    quote: '3.0 to 3.5 gpl of salt is recommended for optimum water conditions.',
    document: 'AquaPure Electronic Chlorine Generator APURE700 and APURE1400 Installation and Operation Manual, LI4011 Rev 7 (2007), Zodiac Pool Systems',
    url: 'https://www.zodiacpoolsystems.com/-/media/9DD79DFAE8A441AE8E80289ABB0216B4.ashx',
    checked: '2026-10-08',
  },
  {
    make: 'Jandy',
    models: ['AquaPure Ei', 'APURE35'],
    minPpm: 4000,
    maxPpm: 4500,
    idealPpm: 4000,
    quote: '4,000 ppm of salt is recommended for optimum water conditions. [troubleshooting:] Maintain a salinity level of 4,000 ppm - 4,500 ppm.',
    document: 'AquaPure Ei Series APURE35 Installation and Operation Manual, H0331400 Rev A (2009), Zodiac Pool Systems; distributor-hosted copy',
    url: 'https://images.inyopools.com/cloud/documents/aquapure-ei-owners-manual.pdf',
    checked: '2026-10-08',
  },
  {
    make: 'Jandy',
    models: ['TruClear'],
    minPpm: 3000,
    maxPpm: 3500,
    idealPpm: 3000,
    quote: '3,000 ppm of salt is recommended for optimum water conditions. [troubleshooting:] 3,000 ppm - 3,500 ppm',
    document: 'Jandy Pro Series TruClear Chlorine Generating System Installation and Operation Manual, H0470600 Rev C (2016), Zodiac Pool Systems; retailer-hosted copy (a newer revision, H0613500, was not opened)',
    url: 'https://cdn.shopify.com/s/files/1/2473/3280/files/truclearinstall.pdf',
    checked: '2026-10-08',
  },
  {
    make: 'CircuPool',
    models: ['RJ+', 'RJ20+', 'RJ30+', 'RJ45+', 'RJ60+', 'RJ-20 Plus', 'RJ-30 Plus', 'RJ-45 Plus', 'RJ-60 Plus'],
    minPpm: 3000,
    maxPpm: 4000,
    idealPpm: 3500,
    quote: CIRCUPOOL_IDEAL,
    document: 'RJ+ Saltwater Chlorination System Installation and Operation Guide, 3300-7A R202411 (2024)',
    url: 'https://www.circupool.com/assets/doc/CircuPool-RJ-Plus-Manual.pdf',
    checked: '2026-10-08',
  },
  {
    make: 'CircuPool',
    models: ['CORE', 'CORE15', 'CORE35', 'CORE55'],
    minPpm: 3000,
    maxPpm: 4000,
    idealPpm: 3500,
    quote: CIRCUPOOL_IDEAL,
    document: 'CORE-Series Saltwater Chlorination System Installation and Operation Guide, 4300-8A R202411 (2024)',
    url: 'https://www.circupool.com/assets/doc/CircuPool-CORE-Manual.pdf',
    checked: '2026-10-08',
  },
  {
    make: 'CircuPool',
    models: ['Universal', 'UL25', 'UL40', 'UL55'],
    minPpm: 3000,
    maxPpm: 4000,
    idealPpm: 3500,
    quote: CIRCUPOOL_IDEAL,
    document: 'Universal Series Installation and Operation Guide, 2200-3A R202411 (2024); distributor-hosted copy',
    url: 'https://www.discountsaltpool.com/assets/doc/CircuPool-Universal-Manual.pdf',
    checked: '2026-10-08',
  },
  {
    make: 'AutoPilot',
    models: ['Digital Nano', 'Digital Nano+', 'Nano', 'Nano+', '75040', '75041', '75042', '75043'],
    minPpm: 3000,
    maxPpm: 3500,
    quote: 'The ideal salt range is 3000 - 3500 ppm (mg/L). The minimum salt level is 2500 ppm (mg/L).',
    document: "Pool Pilot Digital Nano / Digital Nano+ Owner's Manual, LTP0086 Rev-1B (2013), AquaCal AutoPilot; distributor-hosted copy",
    url: 'https://www.discountsaltpool.com/assets/doc/AutoPilot-Digital-Nano-Manual.pdf',
    checked: '2026-10-08',
  },
  {
    make: 'AutoPilot',
    models: ['Professional', 'Pool Pilot Professional', 'Pro'],
    minPpm: 2500,
    maxPpm: 3500,
    quote: 'It is important that a salt residual of 2500 to 3500 ppm (2,5 – 3,5 g/l) be maintained at all times for peak efficiency.',
    document: 'Pool Pilot Professional Installation / Operation Manual (2009), AquaCal AutoPilot; distributor-hosted copy',
    url: 'https://assets.poolweb.com/products/AquaCal/Pool-Pilot-Pro_Manual.pdf?sku=PRO4US',
    checked: '2026-10-08',
  },
  {
    make: 'AutoPilot',
    models: ['Evolve', 'Pool Pilot Evolve'],
    minPpm: 3500,
    maxPpm: 4500,
    quote: 'The salt level should be maintained between 3,500 - 4,500 ppm (mg/L).',
    document: "Pool Pilot Evolve Owner's / Installation Manual, LTP17171 Rev A, AquaCal AutoPilot; distributor-hosted copy",
    url: 'https://www.discountsaltpool.com/assets/doc/Pool-Pilot-Evolve-Manual.pdf',
    checked: '2026-10-08',
  },
];

export interface SaltCellMatch extends SaltCellRange {
  /** The model as entered, so the answer can be shown with it. */
  model: string;
  /** The salt the dose aims for: the ideal figure, else the middle of the range. */
  targetPpm: number;
  /** Short source line for a screen: "<make> <document>". */
  source: string;
}

/** Letters and digits only, lower case: "T-CELL-15" and "tcell 15" are the same model. */
export const cellKey = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export function saltCellRange(make: string, model: string): Answer<SaltCellMatch> {
  const questions: Question[] = [];
  if (typeof make !== 'string' || !make.trim()) questions.push({ field: 'make', ask: 'Who makes the salt cell? It is on the cell or the control box.' });
  if (typeof model !== 'string' || !model.trim()) questions.push({ field: 'model', ask: 'Which model is the salt cell? It is printed on the cell.' });
  if (questions.length) return { ok: false, questions };
  const makes = SALT_CELLS.filter((r) => cellKey(r.make) === cellKey(make));
  if (!makes.length) {
    return {
      ok: false,
      questions: [{ field: 'make', ask: `No manufacturer range on file for "${make}". Which make is it? Known: ${knownMakes().join(', ') || 'none yet'}.` }],
    };
  }
  const row = makes.find((r) => r.models.some((m) => cellKey(m) === cellKey(model)));
  if (!row) {
    const models = makes.flatMap((r) => r.models);
    return {
      ok: false,
      questions: [{ field: 'model', ask: `No ${make} range on file for model "${model}". Which is it? Known: ${models.join(', ')}.` }],
    };
  }
  return {
    ok: true,
    value: {
      ...row,
      model,
      targetPpm: row.idealPpm ?? (row.minPpm + row.maxPpm) / 2,
      source: `${row.make} ${row.document}`,
    },
  };
}

export const knownMakes = (): string[] => [...new Set(SALT_CELLS.map((r) => r.make))];
