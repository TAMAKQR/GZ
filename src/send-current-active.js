import { config, validateConfig } from './config.js';
import { createNotifier } from './notifier.js';
import { filterItemsForProfile, scrapeAllItems } from './scraper.js';

validateConfig();

const allItems = await scrapeAllItems(config);

for (const destination of config.destinations) {
  const notifier = createNotifier(config.telegramBotToken, destination.chatId);
  const items = filterItemsForProfile(allItems, config, destination);

  for (const item of items) {
    await notifier.sendItem(item);
    console.log(`Sent ${destination.name}: ${item.number || item.id}`);
  }

  if (items.length === 0) {
    console.log(`No matching active items found for ${destination.name}.`);
  }
}
