import { Telegraf } from 'telegraf';
import { scrapeDellaTrucks } from './dellaScraper.js';
import { scrapeJukterLoads } from './jukterScraper.js';
import { scrapeReisLoads } from './reisScraper.js';
import { scrapeTrafficLoads } from './trafficScraper.js';
import { scrapeIfuraLoads } from './ifuraScraper.js';
import { scrapeLogihubLoads } from './logihubScraper.js';
import { loadSeenItems, saveSeenItems } from './store.js';

export async function startLogisticsMonitor(config) {
  const bot = new Telegraf(config.botToken);

  console.log(
    `Starting Kazakhstan logistics monitor. Interval: ${config.checkIntervalMinutes} minutes.`
  );

  try {
    await bot.telegram.sendMessage(
      config.chatId,
      'Мониторинг Казахстана запущен: по очереди отправляются новый груз и свободный транспорт.'
    );
  } catch (error) {
    console.error('Failed to send logistics startup message:', error.message);
  }

  const sources = [
    {
      name: 'DELLA транспорт',
      kind: 'transport',
      dataFile: config.dataFile,
      scrape: () => scrapeDellaTrucks(config.sourceUrl)
    },
    {
      name: 'Júkter',
      kind: 'order',
      dataFile: config.jukterDataFile,
      scrape: () => scrapeJukterLoads(config.jukterUrl)
    },
    {
      name: 'Reis',
      kind: 'order',
      dataFile: config.reisDataFile,
      scrape: () => scrapeReisLoads(config.reisUrl)
    },
    {
      name: 'Traffic',
      kind: 'order',
      dataFile: config.trafficDataFile,
      scrape: () => scrapeTrafficLoads(config.trafficUrl)
    },
    {
      name: 'iFura',
      kind: 'order',
      dataFile: config.ifuraDataFile,
      scrape: () => scrapeIfuraLoads(config.ifuraUrl)
    },
    {
      name: 'LogiHub',
      kind: 'order',
      dataFile: config.logihubDataFile,
      scrape: () => scrapeLogihubLoads(config.logihubUrl)
    }
  ];

  for (const source of sources) {
    source.seenIds = await loadSeenItems(source.dataFile);
    source.initialized = false;
  }

  const checkOnce = async () => {
    if (checkOnce.running) return;
    checkOnce.running = true;

    try {
      const pending = { order: [], transport: [] };

      for (const source of sources) {
        try {
          const items = deduplicateItems(await source.scrape());

          if (!source.initialized && source.seenIds.size === 0) {
            source.seenIds.add('__initialized__');
            for (const item of items) source.seenIds.add(item.id);
            await saveSeenItems(source.dataFile, source.seenIds);
            source.initialized = true;
            console.log(
              `Initial ${source.name} scan completed. Saved ${items.length} Kazakhstan items.`
            );
            continue;
          }

          source.initialized = true;
          for (const item of items) {
            if (!source.seenIds.has(item.id)) pending[source.kind].push({ item, source });
          }
        } catch (error) {
          console.error(`${new Date().toISOString()} ${source.name} check failed:`, error.message);
        }
      }

      const queue = buildAlternatingQueue(
        pending.order.reverse(),
        pending.transport.reverse()
      );
      const changedSources = new Set();

      for (const entry of queue) {
        try {
          await bot.telegram.sendMessage(config.chatId, formatLoad(entry.item), {
            parse_mode: 'HTML',
            disable_web_page_preview: true
          });
          entry.source.seenIds.add(entry.item.id);
          changedSources.add(entry.source);
        } catch (error) {
          console.error(
            `Failed to send ${entry.source.name} item ${entry.item.id}:`,
            error.message
          );
          break;
        }
      }

      for (const source of changedSources) {
        await saveSeenItems(source.dataFile, source.seenIds);
      }

      console.log(
        `${new Date().toISOString()} Kazakhstan logistics: pending orders ${pending.order.length}, ` +
          `transport ${pending.transport.length}, sent ${queue.length}.`
      );
    } catch (error) {
      console.error(`${new Date().toISOString()} Kazakhstan logistics cycle failed:`, error.message);
    } finally {
      checkOnce.running = false;
    }
  };

  await checkOnce();
  setInterval(checkOnce, config.checkIntervalMinutes * 60 * 1000);
}

export function buildAlternatingQueue(orders, transport) {
  const queue = [];
  const pairCount = Math.min(orders.length, transport.length);
  for (let index = 0; index < pairCount; index += 1) {
    queue.push(orders[index], transport[index]);
  }
  return queue;
}

export function deduplicateItems(items) {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

export function formatLoad(item) {
  return [
    item.kind === 'transport'
      ? '<b>Новый свободный транспорт</b>'
      : '<b>Новая заявка на грузоперевозку</b>',
    `Источник: ${escapeHtml(item.source || '')}`,
    '',
    `<b>${escapeHtml(item.title)}</b>`,
    escapeHtml(item.description),
    '',
    `<a href="${escapeHtml(item.url)}">${
      item.kind === 'transport' ? 'Открыть транспорт' : 'Открыть заявку'
    }</a>`
  ]
    .filter(Boolean)
    .join('\n');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
