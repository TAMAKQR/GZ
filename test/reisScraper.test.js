import test from 'node:test';
import assert from 'node:assert/strict';
import { parseReisLoads } from '../src/reisScraper.js';

const card = `
  <a class="flex min-w-0 flex-1 flex-col outline-none"
     aria-label="Открыть объявление: Астана — Алматы" href="/cargo/1329441">
    <p class="flex flex-wrap items-center gap-x-1.5 text-[12px] font-medium">
      <span>1 т</span><span>•</span><span>3 м³</span><span>•</span><span>Крытый</span>
    </p>
    <span class="block text-[1.35rem] font-bold tabular-nums leading-none">150 000 ₸</span>
    <p class="mt-3 line-clamp-2 text-[13px]">Мебель в коробках</p>
    <span>Погрузка: <!-- -->25 июл.<!-- --> · сегодня</span>
  </a>`;

test('parses public Reis load cards', () => {
  const items = parseReisLoads(card);
  assert.equal(items.length, 1);
  assert.equal(items[0].id, 'reis-1329441');
  assert.equal(items[0].route, 'Астана — Алматы');
  assert.equal(items[0].cargo, 'Мебель в коробках');
  assert.match(items[0].description, /Транспорт: Крытый/);
});

test('detects imported loads to avoid cross-site duplicates', () => {
  const imported =
    card +
    '<script>self.__next_f.push([1,"{\\"id\\":1329441,\\"user\\":{},\\"external_source\\":\\"della\\"}"])</script>';
  assert.equal(parseReisLoads(imported)[0].externalSource, 'della');
});
