// An owner's first look: empty route, load the demo pools, open a stop,
// start readings, then report a problem. Runs first; tech-day reads its pools.
import { visible } from '../expect.mjs';

export default {
  id: 'owner-day',
  order: 10,
  persona: { email: 'owner@example.test', label: 'Owner, first morning with the app' },
  async run(page, step, { brand }) {
    await step('Today shows the brand', async () => {
      await page.goto('/#/');
      await visible(page.getByText(brand.name, { exact: true }).first());
    });

    await step('Route is empty and offers the demo pools', async () => {
      await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: /Route/ }).click();
      await visible(page.getByText('No pools on file yet'));
      await visible(page.getByRole('button', { name: 'Load the demo pools' }));
    });

    await step('Load the demo pools', async () => {
      await page.getByRole('button', { name: 'Load the demo pools' }).click();
      await visible(page.getByText('Maple Court').first(), 30_000);
    });

    await step('Open Maple Court', async () => {
      await page.getByRole('link', { name: /Maple Court/ }).first().click();
      await visible(page.getByRole('heading', { name: 'Maple Court' }));
    });

    await step("Enter today's readings", async () => {
      await page.getByRole('link', { name: "Enter today's readings" }).click();
      await visible(page.getByRole('heading', { name: /Today's readings/ }));
    });

    await step('More, then Report a problem', async () => {
      await page.goto('/#/more');
      await page.getByRole('link', { name: /Report a problem/ }).click();
      await visible(page.getByText('Which part of the app?'));
    });

    await step('Fill in the report', async () => {
      await page.getByRole('button', { name: 'Route View' }).click();
      await page.getByRole('button', { name: /^Minor/ }).click();
      await page.getByLabel('In a few words').fill('Journey check: stop list order');
      await page.getByLabel('What happened').fill('An automated user journey filed this to check that the form saves.');
    });

    await step('Send it', async () => {
      await page.getByRole('button', { name: 'Send report' }).click();
      await visible(page.getByText('Thanks, got it.'));
    });
  },
};
