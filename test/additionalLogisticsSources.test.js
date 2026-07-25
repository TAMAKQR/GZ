import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTrafficLoads } from '../src/trafficScraper.js';
import { parseIfuraLoads } from '../src/ifuraScraper.js';
import { parseLogihubLoads } from '../src/logihubScraper.js';
import {
  buildAlternatingQueue,
  deduplicateItems
} from '../src/logisticsMonitor.js';

test('parses Traffic API loads', () => {
  const [item] = parseTrafficLoads({ data: [{ id: 1, title: 'тент мебель', details: { from_string: 'Алматы KZ', to_string: 'Астана KZ', distance: '1200 км' }, price: { price: '500000 тенге' }, author: { phone: '+7700' } }] });
  assert.equal(item.route, 'Алматы KZ — Астана KZ');
  assert.match(item.description, /Контакт: \+7700/);
});

test('parses iFura cards', () => {
  const html = '<a href="/cargo/almaty-astana-gruz-9" class="pro-row"><div class="pro-row__route">Алматы <i></i> Астана</div><div><b>25 июл.</b><b>тент</b><b>20 т</b><b>86 м³</b><b>мебель</b></div><div class="pro-row__price"><div>500 000 ₸</div></div></a>';
  const [item] = parseIfuraLoads(html, 'https://ifura.kz/');
  assert.equal(item.id, 'ifura-9');
  assert.equal(item.route, 'Алматы — Астана');
});

test('parses LogiHub cards', () => {
  const html = '<div class="hero-request-item"><a href="/cargo/almaty-astana">Алматы, Казахстан → Астана, Казахстан</a><span class="hero-request-tag hero-request-tag--weight">20 000 кг</span><span class="hero-request-tag hero-request-tag--cargo">Оборудование</span></div></div></div><div class="hero-trust">';
  assert.equal(parseLogihubLoads(html, 'https://logihub.kz/')[0].cargo, 'Оборудование');
});

test('removes duplicate logistics listings before sending', () => {
  const first = { id: 'same-id', title: 'Алматы — Астана' };
  const duplicate = { id: 'same-id', title: 'Алматы — Астана' };
  const other = { id: 'other-id', title: 'Алматы — Шымкент' };

  assert.deepEqual(deduplicateItems([first, duplicate, other]), [duplicate, other]);
});

test('alternates Kazakhstan orders and available transport without leftovers', () => {
  const orders = [{ item: { id: 'order-1' } }, { item: { id: 'order-2' } }];
  const transport = [{ item: { id: 'truck-1' } }];

  assert.deepEqual(
    buildAlternatingQueue(orders, transport).map((entry) => entry.item.id),
    ['order-1', 'truck-1']
  );
});
