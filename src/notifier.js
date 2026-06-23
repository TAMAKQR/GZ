import { Telegraf } from 'telegraf';

export function createNotifier(token, chatId) {
  const bot = new Telegraf(token);

  return {
    async sendStartup(label) {
      await bot.telegram.sendMessage(
        chatId,
        `Мониторинг госзакупок запущен${label ? `: ${label}` : ''}.`
      );
    },

    async sendItem(item) {
      await bot.telegram.sendMessage(chatId, formatItem(item), {
        parse_mode: 'HTML',
        disable_web_page_preview: true
      });
    }
  };
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function formatItem(item) {
  const lines = [
    `<b>Новая закупка${item.profileLabel ? `: ${escapeHtml(item.profileLabel)}` : ''}</b>`,
    '',
    `<b>${escapeHtml(item.title || 'Без названия')}</b>`
  ];

  if (item.description && item.description !== item.title) {
    lines.push(escapeHtml(item.description));
  }

  if (item.matchedKeywords?.length) {
    lines.push('', `Совпало: ${escapeHtml(item.matchedKeywords.slice(0, 8).join(', '))}`);
  }

  if (item.url) {
    lines.push('', `<a href="${escapeHtml(item.url)}">Открыть на портале</a>`);
  }

  return lines.join('\n');
}
