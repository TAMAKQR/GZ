import { chromium } from 'playwright';
import https from 'node:https';
import { matchRelevanceProfile } from './relevanceProfiles.js';

const DEFAULT_TIMEOUT_MS = 45000;

export async function scrapeItems(config) {
  const items = await scrapeAllItems(config);
  return filterItemsForProfile(items, config, {
    name: config.relevanceProfile,
    profile: config.relevanceProfile,
    filterKeywords: config.filterKeywords
  });
}

export async function scrapeAllItems(config) {
  if (config.scraperMode === 'api') {
    return scrapeWithApi(config);
  }

  if (config.scraperMode === 'browser') {
    return scrapeWithBrowser(config);
  }

  throw new Error(`Unsupported SCRAPER_MODE="${config.scraperMode}". Use api or browser.`);
}

async function scrapeWithApi(config) {
  const url = withRows(config.apiUrl, config.apiRows);
  const payload = await getJson(url);
  const rows = Array.isArray(payload.content) ? payload.content : [];

  return rows
    .map((row) => normalizeApiItem(row, config.portalUrl))
    .filter((item) => item.id && item.title)
    .filter((item) => !config.excludedStatuses.includes(item.status));
}

function normalizeApiItem(row, portalUrl) {
  const url = new URL(`/public/order/view/${row.id}`, portalUrl).toString();
  const amount =
    typeof row.amount === 'number'
      ? new Intl.NumberFormat('ru-RU').format(row.amount)
      : row.amount || '';

  return {
    id: row.id,
    number: row.number,
    title: row.name || row.number || row.id,
    description: [
      row.companyName ? `Организация: ${row.companyName}` : '',
      amount ? `Сумма: ${amount} сом` : '',
      row.datePublished ? `Дата публикации: ${row.datePublished}` : '',
      row.dateContest ? `Срок подачи: ${row.dateContest}` : '',
      row.status ? `Статус: ${row.status}` : ''
    ]
      .filter(Boolean)
      .join('\n'),
    url,
    companyName: row.companyName || '',
    amount,
    datePublished: row.datePublished || '',
    dateContest: row.dateContest || '',
    status: row.status || '',
    type: row.type || '',
    method: row.method || ''
  };
}

async function scrapeWithBrowser(config) {
  const browser = await chromium.launch({ headless: config.headless });
  const page = await browser.newPage({
    locale: 'ru-RU',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
  });

  try {
    await page.goto(config.portalUrl, {
      waitUntil: 'domcontentloaded',
      timeout: DEFAULT_TIMEOUT_MS
    });

    await page.waitForLoadState('networkidle', { timeout: DEFAULT_TIMEOUT_MS }).catch(() => {});
    await page.waitForTimeout(2500);

    const items = await page.evaluate(
      ({ itemSelector, linkSelector, orderLinkSelector, portalUrl }) => {
        const normalize = (value) => value.replace(/\s+/g, ' ').trim();
        const normalizeUrl = (url) => url.replace(/[#?].*$/, '');
        const absoluteUrl = (href) => {
          try {
            return new URL(href, portalUrl).toString();
          } catch {
            return '';
          }
        };
        const isUsefulTitle = (value) => {
          const text = normalize(value);
          if (text.length < 5) return false;
          if (/^№?\s*\d+/.test(text)) return false;
          if (/^(товары|услуги|работы|организация|планируемая сумма|дата публикации|дата окончания)$/i.test(text)) {
            return false;
          }
          return true;
        };
        const nearestItemNode = (link) => {
          let current = link;
          let best = link;

          for (let depth = 0; current && depth < 8; depth += 1) {
            const text = normalize(current.innerText || current.textContent || '');
            if (text.length > 40 && text.length < 1600) best = current;
            if (current.matches?.(itemSelector) && text.length < 1600) return current;
            current = current.parentElement;
          }

          return best;
        };
        const titleFrom = (link, node) => {
          const linkTitle =
            link.getAttribute('title') ||
            link.getAttribute('aria-label') ||
            link.innerText ||
            link.textContent ||
            '';
          if (isUsefulTitle(linkTitle)) return normalize(linkTitle);

          const lines = (node.innerText || node.textContent || '')
            .split(/\n+/)
            .map(normalize)
            .filter(isUsefulTitle);

          return lines.find((line) => line.length <= 220) || normalize(linkTitle) || lines[0] || '';
        };

        const orderLinks = [...document.querySelectorAll(orderLinkSelector)];

        if (orderLinks.length > 0) {
          const byUrl = new Map();

          for (const link of orderLinks) {
            const url = normalizeUrl(absoluteUrl(link.getAttribute('href') || ''));
            if (!url || byUrl.has(url)) continue;

            const node = nearestItemNode(link);
            const description = normalize(node.innerText || node.textContent || '');
            const title = titleFrom(link, node);

            if (title) {
              byUrl.set(url, {
                id: url,
                title,
                description: description.slice(0, 700),
                url
              });
            }
          }

          return [...byUrl.values()];
        }

        const candidates = [...document.querySelectorAll(itemSelector)];
        const extracted = candidates
          .map((node) => {
            const text = normalize(node.innerText || node.textContent || '');
            const link = node.matches(linkSelector)
              ? node
              : node.querySelector(linkSelector);
            const href = link?.getAttribute('href') || '';
            const url = href ? absoluteUrl(href) : '';
            const title =
              normalize(link?.innerText || '') ||
              text.split(/[.!?]\s| \| /)[0] ||
              text.slice(0, 180);

            return {
              id: url || title || text.slice(0, 120),
              title,
              description: text.slice(0, 700),
              url
            };
          })
          .filter((item) => item.id && item.title && item.title.length > 3)
          .filter((item) => !/^(главная|войти|поиск|язык|рус|кыр|eng)$/i.test(item.title));

        const unique = new Map();
        for (const item of extracted) {
          if (!unique.has(item.id)) unique.set(item.id, item);
        }

        return [...unique.values()];
      },
      {
        itemSelector: config.itemSelector,
        linkSelector: config.linkSelector,
        orderLinkSelector: config.orderLinkSelector,
        portalUrl: config.portalUrl
      }
    );

    return items.filter((item) => !config.excludedStatuses.includes(item.status));
  } finally {
    await browser.close();
  }
}

function applyKeywordFilter(items, keywords) {
  if (!keywords.length) return items;

  const lowered = keywords.map((keyword) => keyword.toLowerCase());
  return items.filter((item) => {
    const haystack = `${item.title} ${item.description}`.toLowerCase();
    return lowered.some((keyword) => haystack.includes(keyword));
  });
}

export function filterItemsForProfile(items, config, profileConfig) {
  if (!config.notifyOnlyRelevant) return items;

  return items
    .map((item) => {
      const match = matchRelevanceProfile(
        profileConfig.profile,
        item,
        profileConfig.filterKeywords || []
      );
      return {
        ...item,
        profile: profileConfig.profile,
        profileLabel: profileConfig.name,
        matchedKeywords: match.matchedKeywords,
        negativeMatches: match.negativeMatches,
        unknownProfile: match.unknownProfile
      };
    })
    .filter((item) => {
      if (item.unknownProfile) {
        return applyKeywordFilter([item], profileConfig.filterKeywords || []).length > 0;
      }
      return item.matchedKeywords.length > 0 && item.negativeMatches.length === 0;
    });
}

function withRows(url, rows) {
  const nextUrl = new URL(url);
  if (rows) nextUrl.searchParams.set('rows', String(rows));
  return nextUrl.toString();
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { rejectUnauthorized: false }, (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');

          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(`API request failed with ${response.statusCode}: ${body.slice(0, 300)}`));
            return;
          }

          try {
            resolve(JSON.parse(body));
          } catch (error) {
            reject(error);
          }
        });
      })
      .on('error', reject);
  });
}
