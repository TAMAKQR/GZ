import { Telegraf } from 'telegraf';
import { scrapeDellaAlmatyLoads } from './dellaScraper.js';
import { scrapeJukterAlmatyLoads } from './jukterScraper.js';
import { scrapeReisAlmatyLoads } from './reisScraper.js';
import { scrapeTrafficAlmatyLoads } from './trafficScraper.js';
import { scrapeIfuraAlmatyLoads } from './ifuraScraper.js';
import { scrapeLogihubAlmatyLoads } from './logihubScraper.js';
import { loadSeenItems, saveSeenItems } from './store.js';

export async function startLogisticsMonitor(config) {
  const bot = new Telegraf(config.botToken);

  console.log(
    `Starting logistics monitor for Almaty. Interval: ${config.checkIntervalMinutes} minutes.`
  );

  try {
    await bot.telegram.sendMessage(
      config.chatId,
      'Мониторинг грузов запущен: маршруты с Алматы из открытых источников.'
    );
  } catch (error) {
    console.error('Failed to send logistics startup message:', error.message);
  }

  const sources = [
    {
      name: 'DELLA',
      dataFile: config.dataFile,
      scrape: () => scrapeDellaAlmatyLoads(config.sourceUrl)
    },
    {
      name: 'Júkter',
      dataFile: config.jukterDataFile,
      scrape: () => scrapeJukterAlmatyLoads(config.jukterUrl)
    },
    {
      name: 'Reis',
      dataFile: config.reisDataFile,
      scrape: () => scrapeReisAlmatyLoads(config.reisUrl)
    },
    {
      name: 'Traffic',
      dataFile: config.trafficDataFile,
      scrape: () => scrapeTrafficAlmatyLoads(config.trafficUrl)
    },
    {
      name: 'iFura',
      dataFile: config.ifuraDataFile,
      scrape: () => scrapeIfuraAlmatyLoads(config.ifuraUrl)
    },
    {
      name: 'LogiHub',
      dataFile: config.logihubDataFile,
      scrape: () => scrapeLogihubAlmatyLoads(config.logihubUrl)
    }
  ];

  for (const source of sources) {
    await startSource(source, bot, config);
  }
}

async function startSource(source, bot, config) {
  const seenIds = await loadSeenItems(source.dataFile);
  let initialScanCompleted = false;
  let isChecking = false;

  const checkOnce = async () => {
    if (isChecking) return;
    isChecking = true;

    try {
      const items = await source.scrape();
      const newItems = items.filter((item) => !seenIds.has(item.id));

      if (!initialScanCompleted && seenIds.size === 0) {
        seenIds.add('__initialized__');
        for (const item of items) seenIds.add(item.id);
        await saveSeenItems(source.dataFile, seenIds);
        initialScanCompleted = true;
        console.log(
          `Initial ${source.name} scan completed. Saved ${items.length} Almaty loads.`
        );
        return;
      }

      let sentCount = 0;
      for (const item of newItems.reverse()) {
        try {
          await bot.telegram.sendMessage(config.chatId, formatLoad(item), {
            parse_mode: 'HTML',
            disable_web_page_preview: true
          });
          seenIds.add(item.id);
          sentCount += 1;
        } catch (error) {
          console.error(`Failed to send ${source.name} load ${item.id}:`, error.message);
        }
      }

      if (sentCount > 0) await saveSeenItems(source.dataFile, seenIds);
      initialScanCompleted = true;
      console.log(
        `${new Date().toISOString()} ${source.name} Almaty: checked ${items.length}, sent: ${sentCount}.`
      );
    } catch (error) {
      console.error(`${new Date().toISOString()} ${source.name} check failed:`, error.message);
    } finally {
      isChecking = false;
    }
  };

  await checkOnce();
  setInterval(checkOnce, config.checkIntervalMinutes * 60 * 1000);
}

export function formatLoad(item) {
  return [
    '<b>Новая заявка на грузоперевозку</b>',
    `Источник: ${escapeHtml(item.source || '')}`,
    '',
    `<b>${escapeHtml(item.title)}</b>`,
    escapeHtml(item.description),
    '',
    `<a href="${escapeHtml(item.url)}">Открыть заявку</a>`
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
