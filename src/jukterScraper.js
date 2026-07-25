export async function scrapeJukterAlmatyLoads(url) {
  return (await scrapeJukterLoads(url)).filter(({ route }) =>
    /(^|[\s—-])(алматы|алма-ата)(?=\s|\(|—|-|$)/i.test(route)
  );
}

export async function scrapeJukterLoads(url) {
  const response = await fetch(url, {
    headers: {
      accept: 'text/html,application/xhtml+xml',
      'accept-language': 'ru-RU,ru;q=0.9',
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
    },
    signal: AbortSignal.timeout(30000)
  });

  if (!response.ok) {
    throw new Error(`Júkter request failed with ${response.status}`);
  }

  return parseJukterLoads(await response.text());
}

export function parseJukterLoads(html) {
  const cards =
    html.match(
      /<div class="articles__item item-articles">[\s\S]*?(?=<div class="articles__item item-articles">|<\/div>\s*<\/div>\s*<\/div>\s*<\/section>)/g
    ) || [];

  return cards
    .map((card) => {
      const desktop = card.split('<div class="item-articles__mobile')[0];
      const towns = classTexts(desktop, 'item-articles__town');
      const url = desktop.match(
        /href="(https:\/\/jukter\.kz\/orders\/(\d+))"/i
      );
      if (towns.length < 2 || !url) return null;

      const route = `${towns[0]} — ${towns[1]}`;
      const cargo = classTextByFragment(desktop, '_icon-box');
      const date = classTextByFragment(desktop, '_icon-today');
      const truckType = classTextByFragment(desktop, '_icon-bus');
      const weight = classTextByFragment(desktop, '_icon-scales');
      const volume = classTextByFragment(desktop, '_icon-up-down');
      const distance = classText(desktop, 'item-articles__long');
      const price = cleanHtml(
        desktop.match(/<div class="item-articles__cost">[\s\S]*?<h5>([\s\S]*?)<\/h5>/i)?.[1] ||
          ''
      );

      return {
        id: `jukter-${url[2]}`,
        source: 'Júkter.kz',
        title: route,
        route,
        cargo,
        url: url[1],
        description: [
          date ? `Дата загрузки: ${date}` : '',
          cargo ? `Груз: ${cargo}` : '',
          truckType ? `Транспорт: ${truckType}` : '',
          weight ? `Вес: ${weight}` : '',
          volume ? `Объём: ${volume}` : '',
          distance ? `Расстояние: ${distance}` : '',
          price ? `Ставка: ${price}` : ''
        ]
          .filter(Boolean)
          .join('\n')
      };
    })
    .filter(Boolean);
}

function classText(html, className) {
  const pattern = new RegExp(
    `<[^>]+class="[^"]*\\b${className}\\b[^"]*"[^>]*>([\\s\\S]*?)<\\/[^>]+>`,
    'i'
  );
  return cleanHtml(html.match(pattern)?.[1] || '');
}

function classTextByFragment(html, fragment) {
  const escaped = fragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `<[^>]+class="[^"]*${escaped}[^"]*"[^>]*>([\\s\\S]*?)<\\/[^>]+>`,
    'i'
  );
  return cleanHtml(html.match(pattern)?.[1] || '');
}

function classTexts(html, className) {
  const pattern = new RegExp(
    `<[^>]+class="[^"]*\\b${className}\\b[^"]*"[^>]*>([\\s\\S]*?)<\\/[^>]+>`,
    'gi'
  );
  return [...html.matchAll(pattern)].map((match) => cleanHtml(match[1])).filter(Boolean);
}

function cleanHtml(value) {
  return String(value)
    .replace(/<[^>]*>/g, ' ')
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&mdash;', '—')
    .replaceAll('&ndash;', '–')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .trim();
}
