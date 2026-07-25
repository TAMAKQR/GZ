export async function scrapeTrafficAlmatyLoads(url) {
  return (await scrapeTrafficLoads(url)).filter(({ route }) => hasAlmaty(route));
}

export async function scrapeTrafficLoads(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Traffic request failed with ${response.status}`);
  return parseTrafficLoads(await response.json());
}

export function parseTrafficLoads(payload) {
  return (Array.isArray(payload?.data) ? payload.data : []).map((row) => {
    const details = row.details || {};
    const route = `${details.from_string || details.from || ''} — ${details.to_string || details.to || ''}`;
    return {
      id: `traffic-${row.id}`,
      source: 'Traffic.com.kz',
      title: route,
      route,
      cargo: row.title || details.title || '',
      url: `https://traffic.com.kz/cargo/${row.id}`,
      description: [
        details.start_date ? `Дата загрузки: ${details.start_date}` : '',
        row.title ? `Груз: ${row.title}` : '',
        details.net ? `Вес: ${details.net} т` : '',
        details.volume ? `Объём: ${details.volume} м³` : '',
        details.distance ? `Расстояние: ${details.distance}` : '',
        row.price?.price ? `Ставка: ${row.price.price}` : '',
        row.price?.payment_type ? `Оплата: ${row.price.payment_type}` : '',
        row.author?.phone ? `Контакт: ${row.author.phone}` : ''
      ].filter(Boolean).join('\n')
    };
  });
}

function hasAlmaty(value) {
  return /(^|[\s—-])(алматы|алма-ата)(?=\s|—|-|$)/i.test(value);
}
