import dotenv from 'dotenv';

dotenv.config();

function intFromEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function boolFromEnv(name, fallback) {
  const raw = process.env[name];
  if (raw == null || raw === '') return fallback;
  return ['1', 'true', 'yes', 'y'].includes(raw.toLowerCase());
}

function listFromEnv(name) {
  return (process.env[name] || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const defaultExcludedStatuses = ['CONTRACT_SIGNED', 'CANCELLED', 'CANCELED'];
const excludedStatuses = listFromEnv('EXCLUDED_STATUSES').length
  ? listFromEnv('EXCLUDED_STATUSES')
  : defaultExcludedStatuses;

export const config = {
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
  telegramChatId: process.env.TELEGRAM_CHAT_ID,
  portalUrl: process.env.PORTAL_URL || 'https://goszakupki.okmot.kg/public/home',
  apiUrl:
    process.env.API_URL ||
    'https://goszakupki.okmot.kg/api/public_tender/published?first=0&rows=100',
  apiRows: intFromEnv('API_ROWS', 100),
  checkIntervalMinutes: intFromEnv('CHECK_INTERVAL_MINUTES', 10),
  scraperMode: process.env.SCRAPER_MODE || 'api',
  headless: boolFromEnv('HEADLESS', true),
  dataFile: process.env.DATA_FILE || 'data/seen-items.json',
  itemSelector:
    process.env.ITEM_SELECTOR ||
    'tr, article, .card, .ant-card, .mat-card, [class*="tender"], [class*="purchase"], [class*="lot"]',
  linkSelector: process.env.LINK_SELECTOR || 'a[href]',
  orderLinkSelector: process.env.ORDER_LINK_SELECTOR || 'a[href*="/public/order/view/"]',
  filterKeywords: listFromEnv('FILTER_KEYWORDS'),
  relevanceProfile: process.env.RELEVANCE_PROFILE || 'catering',
  excludedStatuses,
  notifyOnlyRelevant: boolFromEnv('NOTIFY_ONLY_RELEVANT', true),
  destinations: [
    {
      name: 'Общепит',
      profile: 'catering',
      chatId: process.env.CATERING_CHAT_ID || process.env.TELEGRAM_CHAT_ID,
      dataFile: process.env.CATERING_DATA_FILE || 'data/seen-catering.json',
      filterKeywords: listFromEnv('CATERING_FILTER_KEYWORDS')
    },
    {
      name: 'ARTO',
      profile: 'arto',
      chatId: process.env.ARTO_CHAT_ID,
      dataFile: process.env.ARTO_DATA_FILE || 'data/seen-arto.json',
      filterKeywords: listFromEnv('ARTO_FILTER_KEYWORDS')
    }
  ].filter((destination) => destination.chatId)
};

export function validateConfig() {
  const missing = [];
  if (!config.telegramBotToken) missing.push('TELEGRAM_BOT_TOKEN');
  if (config.destinations.length === 0) missing.push('CATERING_CHAT_ID or ARTO_CHAT_ID');
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
