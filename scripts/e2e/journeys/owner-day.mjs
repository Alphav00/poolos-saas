// An owner's first morning: the getting-started guide, add the first customer
// on today's service day, find them on today's route, open the stop, start
// readings, then report a problem. Runs first; tech-day reads its route.
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

    await step('Today offers to add the first customer', async () => {
      await visible(page.getByRole('region', { name: 'Getting started' }));
      await visible(page.getByRole('link', { name: 'Add a customer' }));
    });

    await step('Add a customer', async () => {
      await page.getByRole('link', { name: 'Add a customer' }).click();
      await visible(page.getByRole('heading', { name: 'Add a customer' }));
      await page.getByLabel('Customer name').fill('Harper family');
      await page.getByLabel('Address').fill('14 Made Up Lane');
      await page.getByLabel('Pool size, gallons').fill('18000');
      await page.getByRole('button', { name: 'Vinyl' }).click();
      await page.getByRole('button', { name: 'Liquid chlorine' }).click();
      await page.getByRole('button', { name: 'Add customer' }).click();
    });

    await step("They are on today's route", async () => {
      await visible(page.getByRole('region', { name: 'Stops' }).getByRole('link', { name: /Harper family/ }), 30_000);
    });

    await step('Open the stop', async () => {
      await page.getByRole('region', { name: 'Stops' }).getByRole('link', { name: /Harper family/ }).click();
      await visible(page.getByRole('heading', { name: 'Harper family' }));
      await visible(page.getByText('14 Made Up Lane'));
    });

    await step("Enter today's readings", async () => {
      await page.getByRole('link', { name: "Enter today's readings" }).click();
      await visible(page.getByRole('heading', { name: /Today's readings/ }));
    });

    await step('Save a chlorine reading', async () => {
      await page.locator('button.e').first().click();
      const typed = page.getByLabel('Or type it');
      await typed.fill('3');
      await typed.press('Tab');
      await page.getByRole('dialog').getByRole('button', { name: 'Done', exact: true }).first().click();
      await page.getByRole('button', { name: 'Save readings' }).click();
      await visible(page.getByRole('heading', { name: 'Harper family' }), 30_000);
    });

    await step('The stop is done on the route', async () => {
      await page.getByRole('link', { name: '‹ Route' }).click();
      await visible(page.getByText('1 / 1 done'));
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
