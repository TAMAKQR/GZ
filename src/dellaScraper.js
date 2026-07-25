import { createHash } from 'node:crypto';

const REQUEST_TIMEOUT_MS = 30000;

export async function scrapeDellaAlmatyLoads(url) {
  const response = await fetch(url, {
    headers: {
      accept: 'text/html,application/xhtml+xml',
      'accept-language': 'ru-RU,ru;q=0.9',
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });

  if (!response.ok) {
    throw new Error(`DELLA request failed with ${response.status}`);
  }

  return parseDellaLoads(await response.text(), url).filter(({ route }) =>
    /(^|[\s—-])(алматы|алма-ата)(?=\s|\(|—|-|$)/i.test(route)
  );
}

export async function scrapeDellaAlmatyTrucks(url) {
  return (await scrapeDellaTrucks(url)).filter(({ route }) =>
    /(^|[\s,—-])(алматы|алма-ата)(?=\s|\(|,|—|-|$)/i.test(route)
  );
}

export async function scrapeDellaTrucks(url) {
  const response = await fetch(url, {
    headers: {
      accept: 'text/html,application/xhtml+xml',
      'accept-language': 'ru-RU,ru;q=0.9',
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });

  if (!response.ok) {
    throw new Error(`DELLA transport request failed with ${response.status}`);
  }

  return parseDellaTrucks(await response.text(), url);
}

export function parseDellaLoads(html, sourceUrl) {
  const cards = html.match(
    /<div class="request_card [^"]*"[\s\S]*?(?=<div class="requests_cards_delimiter|$)/g
  ) || [];

  return cards
    .map((card) => {
      const requestId = attribute(card, 'data-request_id');
      const localities = classTexts(card, 'locality');
      const route =
        localities.length >= 2
          ? `${localities[0]} (KZ) — ${localities[1]} (KZ)`
          : classText(card, 'request_distance');
      const cargo = classText(card, 'cargo_type');
      if (!requestId || !route || !cargo) return null;

      const truckType = classText(card, 'truck_type');
      const weight = classText(card, 'weight');
      const volume = classText(card, 'cube');
      const distance = classText(card, 'distance');
      const date = classText(card, 'date_add');
      const price = firstClassText(card, [
        'request_price',
        'price_value',
        'price_per_distance'
      ]);
      const tags = classTexts(card, 'tag');
      const routePath = classAttribute(card, 'request_distance', 'href');
      const details = [
        date ? `Дата загрузки: ${date}` : '',
        cargo ? `Груз: ${cargo}` : '',
        truckType ? `Транспорт: ${truckType}` : '',
        weight ? `Вес: ${weight}` : '',
        volume ? `Объём: ${volume}` : '',
        distance ? `Расстояние: ${distance}` : '',
        price ? `Ставка: ${price}` : '',
        tags.length ? `Условия: ${tags.join(', ')}` : ''
      ].filter(Boolean);

      return {
        id: createHash('sha256').update(requestId).digest('hex'),
        source: 'DELLA.kz',
        title: route,
        description: details.join('\n'),
        url: routePath ? new URL(routePath, sourceUrl).toString() : sourceUrl,
        route,
        cargo
      };
    })
    .filter(Boolean);
}

export function parseDellaTrucks(html, sourceUrl) {
  const cards = html.match(
    /<div class="request_card [^"]*"[\s\S]*?(?=<div class="requests_cards_delimiter|$)/g
  ) || [];

  return cards
    .map((card) => {
      const requestId = attribute(card, 'data-request_id');
      const route = classElementText(card, 'request_distance');
      const truckType = classText(card, 'truck_type');
      if (!requestId || !route || !truckType) return null;

      const date = classText(card, 'date_add');
      const weight = classText(card, 'weight');
      const volume = classText(card, 'cube');
      const rawTemperature = classText(card, 'temperature');
      const temperature = /^C\s*0$/i.test(rawTemperature) ? '' : rawTemperature;
      const requestText = classText(card, 'request_text');
      const tags = classTexts(card, 'tag');
      const routePath = classAttribute(card, 'request_distance', 'href');
      const details = [
        date ? `Свободна: ${date}` : '',
        `Кузов: ${truckType}`,
        weight ? `Грузоподъёмность: ${weight}` : '',
        volume ? `Объём: ${volume}` : '',
        temperature ? `Температура: ${temperature}` : '',
        requestText,
        tags.length ? `Возможности: ${tags.join(', ')}` : ''
      ].filter(Boolean);

      return {
        id: createHash('sha256').update(`truck:${requestId}`).digest('hex'),
        kind: 'transport',
        source: 'DELLA.kz',
        title: route,
        description: details.join('\n'),
        url: routePath ? new URL(routePath, sourceUrl).toString() : sourceUrl,
        route,
        cargo: 'Свободный транспорт'
      };
    })
    .filter(Boolean);
}

function attribute(html, name) {
  return decodeHtml(html.match(new RegExp(`${name}="([^"]+)"`, 'i'))?.[1] || '');
}

function classText(html, className) {
  const pattern = new RegExp(
    `<[^>]+class="[^"]*\\b${className}\\b[^"]*"[^>]*>([\\s\\S]*?)<\\/[^>]+>`,
    'i'
  );
  return cleanHtml(html.match(pattern)?.[1] || '');
}

function classElementText(html, className) {
  const pattern = new RegExp(
    `<([a-z][\\w:-]*)[^>]*class="[^"]*\\b${className}\\b[^"]*"[^>]*>([\\s\\S]*?)<\\/\\1>`,
    'i'
  );
  return cleanHtml(html.match(pattern)?.[2] || '');
}

function classAttribute(html, className, attributeName) {
  const tag = html.match(
    new RegExp(`<[^>]+class="[^"]*\\b${className}\\b[^"]*"[^>]*>`, 'i')
  )?.[0];
  return tag ? attribute(tag, attributeName) : '';
}

function firstClassText(html, classNames) {
  for (const className of classNames) {
    const value = classText(html, className);
    if (value) return value;
  }
  return '';
}

function classTexts(html, className) {
  const pattern = new RegExp(
    `<[^>]+class="[^"]*\\b${className}\\b[^"]*"[^>]*>([\\s\\S]*?)<\\/[^>]+>`,
    'gi'
  );
  return [...html.matchAll(pattern)].map((match) => cleanHtml(match[1])).filter(Boolean);
}

function cleanHtml(value) {
  return decodeHtml(
    value
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function decodeHtml(value) {
  return value
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&mdash;', '—')
    .replaceAll('&ndash;', '–')
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'");
}
