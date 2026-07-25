export async function scrapeReisAlmatyLoads(url) {
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
    throw new Error(`Reis request failed with ${response.status}`);
  }

  return parseReisLoads(await response.text()).filter(
    ({ route, externalSource }) =>
      /(^|[\s—-])(алматы|алма-ата)(?=\s|—|-|$)/i.test(route) && !externalSource
  );
}

export function parseReisLoads(html) {
  const pattern =
    /<a class="flex min-w-0 flex-1 flex-col[^"]*"[^>]*aria-label="Открыть объявление: ([^"]+)" href="\/cargo\/(\d+)">([\s\S]*?)<\/a>/g;

  return [...html.matchAll(pattern)].map((match) => {
    const [, encodedRoute, id, card] = match;
    const route = decodeHtml(encodedRoute);
    const details = metadata(card);
    const cargo = classTextContaining(card, 'line-clamp-2');
    const price = classTextContaining(card, 'tabular-nums leading-none');
    const loading = cleanHtml(
      card.match(/Погрузка:\s*([\s\S]*?)(?:<\/span>|<svg)/i)?.[1] || ''
    );
    const externalSource = findExternalSource(html, id);

    return {
      id: `reis-${id}`,
      source: 'Reis.kz',
      externalSource,
      title: route,
      route,
      cargo,
      url: `https://reis.kz/cargo/${id}`,
      description: [
        loading ? `Погрузка: ${loading}` : '',
        cargo ? `Груз: ${cargo}` : '',
        details.weight ? `Вес: ${details.weight}` : '',
        details.volume ? `Объём: ${details.volume}` : '',
        details.truckType ? `Транспорт: ${details.truckType}` : '',
        price ? `Ставка: ${price}` : ''
      ]
        .filter(Boolean)
        .join('\n')
    };
  });
}

function metadata(card) {
  const block =
    card.match(
      /<p class="flex flex-wrap items-center gap-x-1\.5 text-\[12px\][^"]*">([\s\S]*?)<\/p>/
    )?.[1] || '';
  const values = cleanHtml(block)
    .split('•')
    .map((value) => value.trim())
    .filter(Boolean);

  return {
    weight: values.find((value) => /\d[\d.,]*\s*(?:кг|т)$/i.test(value)) || '',
    volume: values.find((value) => /м[³3]/i.test(value)) || '',
    truckType:
      values.find(
        (value) => !/\d[\d.,]*\s*(?:кг|т)$/i.test(value) && !/м[³3]/i.test(value)
      ) ||
      ''
  };
}

function findExternalSource(html, id) {
  const escaped = html.match(
    new RegExp(
      `\\\\"id\\\\":${id},\\\\"user\\\\":[\\s\\S]{0,16000}?\\\\"external_source\\\\":(?:null|\\\\"([^"]*)\\\\")`
    )
  );
  if (escaped) return escaped[1] || '';

  const plain = html.match(
    new RegExp(
      `"id":${id},"user":[\\s\\S]{0,16000}?"external_source":(?:null|"([^"]*)")`
    )
  );
  return plain?.[1] || '';
}

function classTextContaining(html, classFragment) {
  const escaped = classFragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `<[^>]+class="[^"]*${escaped}[^"]*"[^>]*>([\\s\\S]*?)<\\/[^>]+>`,
    'i'
  );
  return cleanHtml(html.match(pattern)?.[1] || '');
}

function cleanHtml(value) {
  return decodeHtml(
    String(value)
      .replace(/<!--.*?-->/g, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function decodeHtml(value) {
  return String(value)
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&mdash;', '—')
    .replaceAll('&ndash;', '–')
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'");
}
