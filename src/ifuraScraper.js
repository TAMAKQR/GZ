export async function scrapeIfuraAlmatyLoads(url) {
  return (await scrapeIfuraLoads(url)).filter(({ route }) =>
    /(^|[\s—-])(алматы|алма-ата)(?=\s|—|-|$)/i.test(route)
  );
}

export async function scrapeIfuraLoads(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`iFura request failed with ${response.status}`);
  return parseIfuraLoads(await response.text(), url);
}

export function parseIfuraLoads(html, baseUrl) {
  const cards = html.match(/<a href="\/cargo\/[^"]+" class="pro-row">[\s\S]*?<\/a>/g) || [];
  return cards.map((card) => {
    const path = card.match(/href="([^"]+)"/)?.[1] || '';
    const id = path.match(/gruz-(\d+)/)?.[1] || path;
    const routeHtml =
      card.match(/<div class="pro-row__route">([\s\S]*?)<\/div>/)?.[1] || '';
    const routeBlock = clean(routeHtml.replace(/<i[\s\S]*?<\/i>/i, ' → '));
    const routeParts = routeBlock.split('→').map(clean).filter(Boolean);
    const route = routeParts.length >= 2 ? `${routeParts[0]} — ${routeParts.at(-1)}` : routeBlock;
    const values = [...card.matchAll(/<b>([\s\S]*?)<\/b>/g)].map((m) => clean(m[1]));
    const price = classText(card, 'pro-row__price');
    return {
      id: `ifura-${id}`,
      source: 'iFura.kz',
      title: route,
      route,
      cargo: values.at(-1) || '',
      url: new URL(path, baseUrl).toString(),
      description: [
        values[0] ? `Дата загрузки: ${values[0]}` : '',
        values.at(-1) ? `Груз: ${values.at(-1)}` : '',
        values[1] ? `Транспорт: ${values[1]}` : '',
        values[2] ? `Вес: ${values[2]}` : '',
        values[3] && values.length > 4 ? `Объём: ${values[3]}` : '',
        price ? `Ставка: ${price}` : ''
      ].filter(Boolean).join('\n')
    };
  });
}

function classText(html, name) {
  return clean(html.match(new RegExp(`<[^>]+class="${name}"[^>]*>([\\s\\S]*?)<\\/[^>]+>`))?.[1] || '');
}
function clean(value) {
  return String(value).replace(/<[^>]*>/g, ' ').replaceAll('&nbsp;', ' ').replace(/\s+/g, ' ').trim();
}
