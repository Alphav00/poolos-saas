// A tech (on staff, not an owner) opens the app. If owner-day ran first a
// customer is on today's route; otherwise the guide says who adds customers.
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
    await step("Route shows today's stops, or who adds customers", async () => {
      await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: /Route/ }).click();
      const stop = page.getByRole('region', { name: 'Stops' }).locator('a.stop').first();
      const ask = page.getByText('Ask an owner, Lead or Dispatcher to add customers.');
      await visible(stop.or(ask));
      hasPools = await stop.isVisible();
      if (await page.getByRole('link', { name: /Add a customer/ }).count()) {
        throw new Error('A technician was offered "Add a customer"');
      }
    });

    if (hasPools) {
      await step('Open the first stop', async () => {
        const first = page.getByRole('region', { name: 'Stops' }).locator('a.stop').first();
        const name = (await first.locator('.nm').innerText()).trim();
        await first.click();
        await visible(page.getByRole('heading', { name, exact: true }));
      });
    }
  },
};
