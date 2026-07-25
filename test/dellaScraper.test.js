import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDellaLoads, parseDellaTrucks } from '../src/dellaScraper.js';

const card = (id, from, to, cargo) => `
  <div class="request_card request_${id}" data-request_id="${id}">
    <div class="date_add">25.07</div>
    <div class="truck_type">тент</div>
    <div class="weight">20 т</div>
    <div class="cube">86 м³</div>
    <div class="request_route">
      <a class="request_distance" href="/distance/?cities=127269,25452&rc=${id}"><span class="locality">${from}</span> (KZ)
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
  assert.equal(
    items[0].url,
    'https://www.della.kz/distance/?cities=127269,25452&rc=one'
  );
});

test('parses public DELLA free transport cards', () => {
  const html = `
    <div class="request_card request_truck" data-request_id="truck-one">
      <div class="date_add">25.07–30.07</div>
      <div class="truck_type">тент</div>
      <div class="weight">20 т</div>
      <div class="cube">86 м³</div>
      <div class="request_route">
        <a class="request_distance" href="/distance/?cities=127269,25452&rc=truck">
          <span class="locality">Алматы</span> (KZ) — <span class="locality">Астана</span> (KZ)
        </a>
      </div>
      <div class="request_text">Кол. машин: <span class="value">2</span></div>
      <div class="tag">Боковая</div>
    </div>
    <div class="requests_cards_delimiter"></div>`;

  const [item] = parseDellaTrucks(html, 'https://www.della.kz/search/');

  assert.equal(item.kind, 'transport');
  assert.equal(item.route, 'Алматы (KZ) — Астана (KZ)');
  assert.match(item.description, /Кузов: тент/);
  assert.match(item.description, /Кол. машин: 2/);
  assert.equal(
    item.url,
    'https://www.della.kz/distance/?cities=127269,25452&rc=truck'
  );
});
