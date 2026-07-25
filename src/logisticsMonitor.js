import { Telegraf } from 'telegraf';
import { scrapeDellaAlmatyLoads } from './dellaScraper.js';
import { loadSeenItems, saveSeenItems } from './store.js';

export async function startLogisticsMonitor(config) {
  const bot = new Telegraf(config.botToken);
  const seenIds = await loadSeenItems(config.dataFile);
  let initialScanCompleted = false;
  let isChecking = false;

  console.log(
    `Starting DELLA logistics monitor for Almaty. Interval: ${config.checkIntervalMinutes} minutes.`
  );

  try {
    await bot.telegram.sendMessage(
      config.chatId,
      'Мониторинг грузов DELLA.kz запущен: маршруты с Алматы.'
    );
  } catch (error) {
    console.error('Failed to send logistics startup message:', error.message);
  }

  const checkOnce = async () => {
    if (isChecking) return;
    isChecking = true;

    try {
      const items = await scrapeDellaAlmatyLoads(config.sourceUrl);
      const newItems = items.filter((item) => !seenIds.has(item.id));

      if (!initialScanCompleted && seenIds.size === 0) {
        for (const item of items) seenIds.add(item.id);
        await saveSeenItems(config.dataFile, seenIds);
        initialScanCompleted = true;
        console.log(`Initial DELLA scan completed. Saved ${items.length} Almaty loads.`);
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
          console.error(`Failed to send DELLA load ${item.id}:`, error.message);
        }
      }

      if (sentCount > 0) await saveSeenItems(config.dataFile, seenIds);
      initialScanCompleted = true;
      console.log(
        `${new Date().toISOString()} DELLA Almaty: checked ${items.length}, sent: ${sentCount}.`
      );
    } catch (error) {
      console.error(`${new Date().toISOString()} DELLA check failed:`, error.message);
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
    '',
    `<b>${escapeHtml(item.title)}</b>`,
    escapeHtml(item.description),
    '',
    `<a href="${escapeHtml(item.url)}">Открыть список грузов DELLA.kz</a>`
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
