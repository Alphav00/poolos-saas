// A tech (not an owner) opens the app. If owner-day ran first the demo pools
// are on file; otherwise the route asks for an owner.
import { visible } from '../expect.mjs';

export default {
  id: 'tech-day',
  order: 20,
  persona: { email: 'tech@example.test', label: 'Tech on the route (not an owner)' },
  async run(page, step, { brand }) {
    await step('Today shows the brand', async () => {
      await page.goto('/#/');
      await visible(page.getByText(brand.name, { exact: true }).first());
    });

    let hasPools = false;
    await step('Route shows the pools, or asks for an owner', async () => {
      await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: /Route/ }).click();
      const stop = page.locator('a.stop').first();
      const ask = page.getByText('Ask an owner to load the demo pools.');
      await visible(stop.or(ask));
      hasPools = await stop.isVisible();
      if (await page.getByRole('button', { name: 'Load the demo pools' }).count()) {
        throw new Error('A non-owner was offered "Load the demo pools"');
      }
    });

    if (hasPools) {
      await step('Open the first pool', async () => {
        const name = (await page.locator('a.stop .nm').first().innerText()).trim();
        await page.locator('a.stop').first().click();
        await visible(page.getByRole('heading', { name, exact: true }));
      });
    }
  },
};
