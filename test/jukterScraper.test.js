import test from 'node:test';
import assert from 'node:assert/strict';
import { parseJukterLoads } from '../src/jukterScraper.js';

test('parses public Júkter load cards', () => {
  const html = `
    <div class="articles__item item-articles">
      <div class="item-articles__desktop">
        <div class="item-articles__town">Алматы <span>(KZ)</span></div>
        <div class="item-articles__long">1448 км</div>
        <div class="item-articles__town">Щучинск <span>(KZ)</span></div>
        <div class="item-articles__li _icon-today">23.07.2026</div>
        <div class="item-articles__li _icon-bus">тент</div>
        <div class="item-articles__li _icon-scales">18 т</div>
        <div class="item-articles__li _icon-up-down">86 м3</div>
        <div class="item-articles__li _icon-box">тнп в коробках</div>
        <a href="https://jukter.kz/orders/1433891">Подробнее</a>
        <div class="item-articles__cost"><h5>700 000 ₸</h5></div>
      </div>
      <div class="item-articles__mobile"></div>
    </div>
    </div></div></div></section>`;

  const items = parseJukterLoads(html);
  assert.equal(items.length, 1);
  assert.equal(items[0].id, 'jukter-1433891');
  assert.equal(items[0].route, 'Алматы (KZ) — Щучинск (KZ)');
  assert.equal(items[0].cargo, 'тнп в коробках');
  assert.match(items[0].description, /Ставка: 700 000 ₸/);
});
