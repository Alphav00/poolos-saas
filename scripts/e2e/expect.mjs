// Shared by the journeys: wait until a locator is on screen, generously.
export async function visible(locator, timeout = 15_000) {
  await locator.waitFor({ state: 'visible', timeout });
}
