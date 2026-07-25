import test from 'node:test';
import assert from 'node:assert/strict';
import { matchRelevanceProfile } from '../src/relevanceProfiles.js';

const matches = (profile, title) =>
  matchRelevanceProfile(profile, { title }).isMatch;

test('ARTO excludes unrelated detergent, vehicle and medical purchases', () => {
  const titles = [
    'Покупка мыло моющих средств и кафеля',
    'Закупка запасных частей для радиологического оборудования',
    'Приобретение запчастей, ремонт и обслуживание служебных автомашин',
    'Закупка автозапчастей для служебных автомобилей',
    'ПОКУПКА ЗАПЧАСТИ ВАЗ 2131',
    'ПОКУПКА ЗАПЧАСТИ ГР.АВТО ХОВО'
  ];

  for (const title of titles) {
    assert.equal(matches('arto', title), false, title);
  }
});

test('ARTO keeps restaurant equipment and related repairs', () => {
  const titles = [
    'Поставка профессионального кухонного оборудования',
    'Ремонт холодильного оборудования столовой',
    'Запасные части для пароконвектомата',
    'Поставка промышленной посудомоечной машины'
  ];

  for (const title of titles) {
    assert.equal(matches('arto', title), true, title);
  }
});

test('catering excludes groceries and accidental word fragments', () => {
  const titles = [
    'Приобретение продуктов питания на 3 квартал 2026 года',
    'Приобретение лабораторных реактивов учреждением Сокулукского района',
    'Приобретение мясо КРС 1 категории'
  ];

  for (const title of titles) {
    assert.equal(matches('catering', title), false, title);
  }
});

test('catering keeps prepared-meal and food-service procurements', () => {
  const titles = [
    'Услуги по организации горячего питания учащихся',
    'Приготовление и поставка готовых обедов',
    'Кейтеринг для официального мероприятия',
    'Услуги столовой по питанию пациентов'
  ];

  for (const title of titles) {
    assert.equal(matches('catering', title), true, title);
  }
});
