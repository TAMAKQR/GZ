import { config, validateConfig } from './config.js';
import { createNotifier } from './notifier.js';
import { filterItemsForProfile, scrapeAllItems } from './scraper.js';
import { loadSeenItems, saveSeenItems } from './store.js';

let isChecking = false;

validateConfig();

const destinations = await Promise.all(
  config.destinations.map(async (destination) => ({
    ...destination,
    notifier: createNotifier(config.telegramBotToken, destination.chatId),
    seenIds: await loadSeenItems(destination.dataFile)
  }))
);

for (const destination of destinations) {
  await destination.notifier.sendStartup(destination.name);
}
await checkOnce();

const intervalMs = config.checkIntervalMinutes * 60 * 1000;
setInterval(checkOnce, intervalMs);

async function checkOnce() {
  if (isChecking) return;
  isChecking = true;

  try {
    const allItems = await scrapeAllItems(config);

    for (const destination of destinations) {
      const items = filterItemsForProfile(allItems, config, destination);
      const newItems = items.filter((item) => !destination.seenIds.has(item.id));

      if (destination.seenIds.size === 0) {
        for (const item of items) destination.seenIds.add(item.id);
        await saveSeenItems(destination.dataFile, destination.seenIds);
        console.log(
          `Initial scan completed for ${destination.name}. Saved ${items.length} existing items.`
        );
        continue;
      }

      for (const item of newItems.reverse()) {
        await destination.notifier.sendItem(item);
        destination.seenIds.add(item.id);
      }

      if (newItems.length > 0) {
        await saveSeenItems(destination.dataFile, destination.seenIds);
      }

      console.log(
        `${new Date().toISOString()} ${destination.name}: checked ${items.length}, new: ${newItems.length}.`
      );
    }
  } catch (error) {
    console.error(`${new Date().toISOString()} Check failed:`, error);
  } finally {
    isChecking = false;
  }
}
