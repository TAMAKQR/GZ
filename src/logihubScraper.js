export async function scrapeLogihubAlmatyLoads(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`LogiHub request failed with ${response.status}`);
  return parseLogihubLoads(await response.text(), url).filter(({ route }) =>
    /(^|[\s,—-])(алматы|алма-ата)(?=\s|,|—|-|$)/i.test(route)
  );
}

export function parseLogihubLoads(html, baseUrl) {
  const cards = html.match(/<div class="hero-request-item">[\s\S]*?(?=<div class="hero-request-item">|<\/div>\s*<\/div>\s*<div class="hero-trust">)/g) || [];
  return cards.map((card) => {
    const link = card.match(/<a href="([^"]+)">([\s\S]*?)<\/a>/);
    const path = link?.[1] || '';
    const route = clean(link?.[2] || '');
    const get = (kind) => clean(card.match(new RegExp(`hero-request-tag--${kind}[^>]*>([\\s\\S]*?)<\\/span>`))?.[1] || '');
    const date = clean(card.match(/hero-request-date[^>]*>([\s\S]*?)<\/div>/)?.[1] || '');
    return {
      id: `logihub-${path}`,
      source: 'LogiHub.kz',
      title: route,
      route,
      cargo: get('cargo'),
      url: new URL(path, baseUrl).toString(),
      description: [
        date ? `Дата: ${date}` : '',
        get('cargo') ? `Груз: ${get('cargo')}` : '',
        get('mode') ? `Транспорт: ${get('mode')}` : '',
        get('weight') ? `Вес: ${get('weight')}` : '',
        get('volume') ? `Объём: ${get('volume')}` : ''
      ].filter(Boolean).join('\n')
    };
  }).filter((item) => item.id && item.route);
}

function clean(value) {
  return String(value).replace(/<[^>]*>/g, ' ').replaceAll('&nbsp;', ' ').replace(/\s+/g, ' ').trim();
}
