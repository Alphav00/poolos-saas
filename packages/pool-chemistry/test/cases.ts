// The waters and doses the parity test runs on both builds of PHREEQC.
// Readings are made up and cover the usual range of pool and spa water.
import type { Water } from '../src';

export const waters: { name: string; water: Water }[] = [];

const temps = [50, 78, 86, 104];
const phs = [7.0, 7.4, 7.8, 8.2];
const tas = [40, 80, 140];
const chs = [100, 300, 600];
const cyas = [0, 40, 90];
for (const t of temps)
  for (const ph of phs)
    for (const ta of tas)
      for (const ch of chs)
        for (const cya of cyas) {
          const salted = (t + ph * 10 + ta + ch + cya) % 2 === 0;
          const water: Water = {
            temperatureF: t,
            ph,
            totalAlkalinity: ta,
            calciumHardness: ch,
            cyanuricAcid: cya,
            freeChlorine: cya ? cya / 10 : 2,
            ...(salted ? { salt: 3200 } : { tds: 1200 }),
            ...(ta === 140 ? { borates: 40 } : {}),
          };
          waters.push({ name: `t${t} ph${ph} ta${ta} ch${ch} cya${cya}`, water });
        }

waters.push({
  name: 'no salt, high calcium (chloride carries the charge)',
  water: { temperatureF: 80, ph: 7.6, totalAlkalinity: 60, calciumHardness: 400, cyanuricAcid: 0, salt: 0 },
});
