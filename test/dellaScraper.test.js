import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDellaLoads } from '../src/dellaScraper.js';

const card = (id, from, to, cargo) => `
  <div class="request_card request_${id}" data-request_id="${id}">
    <div class="date_add">25.07</div>
    <div class="truck_type">тент</div>
    <div class="weight">20 т</div>
    <div class="cube">86 м³</div>
    <div class="request_route">
      <a class="request_distance"><span class="locality">${from}</span> (KZ)
      &mdash; <span class="locality">${to}</span> (KZ)</a>
      <a class="distance">700 км</a>
    </div>
    <span class="cargo_type">${cargo}</span>
    <div class="tag">Без догруза</div>
  </div>
  <div class="requests_cards_delimiter"></div>`;

test('parses public DELLA load cards', () => {
  const items = parseDellaLoads(
    card('one', 'Алматы', 'Шымкент', 'оборудование') +
      card('two', 'Астана', 'Костанай', 'мебель'),
    'https://www.della.kz/search'
  );

  assert.equal(items.length, 2);
  assert.equal(items[0].route, 'Алматы (KZ) — Шымкент (KZ)');
  assert.equal(items[0].cargo, 'оборудование');
  assert.match(items[0].description, /Транспорт: тент/);
});
