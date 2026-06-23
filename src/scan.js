import { config } from './config.js';
import { filterItemsForProfile, scrapeAllItems } from './scraper.js';

const allItems = await scrapeAllItems(config);

for (const destination of config.destinations) {
  const items = filterItemsForProfile(allItems, config, destination);

  console.log(`Found ${items.length} items for ${destination.name}`);
  for (const item of items.slice(0, 10)) {
    console.log('---');
    console.log(item.title);
    if (item.url) console.log(item.url);
    if (item.description) console.log(item.description.slice(0, 300));
    if (item.matchedKeywords?.length) {
      console.log(`Matched: ${item.matchedKeywords.slice(0, 8).join(', ')}`);
    }
  }
}
