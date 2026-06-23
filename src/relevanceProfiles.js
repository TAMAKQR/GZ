const PROFILES = {
  catering: {
    keywords: [
      'питани',
      'организация питания',
      'услуги питания',
      'горячее питание',
      'школьное питание',
      'лечебное питание',
      'диетическое питание',
      'обеспечение питанием',
      'готовое питание',
      'представительские расходы',
      'столов',
      'буфет',
      'кейтеринг',
      'общепит',
      'пищеблок',
      'приготовлен',
      'обед',
      'завтрак',
      'ужин',
      'рацион',
      'меню',
      'продовольств',
      'продукт',
      'мясо',
      'говядин',
      'куриц',
      'рыб',
      'молок',
      'кефир',
      'сметан',
      'творог',
      'сыр',
      'хлеб',
      'булоч',
      'мука',
      'круп',
      'рис',
      'греч',
      'макарон',
      'сахар',
      'чай',
      'масло',
      'яйц',
      'овощ',
      'фрукт',
      'картоф',
      'сок',
      'компот'
    ],
    negativeKeywords: [
      'оборудован',
      'запчаст',
      'запасн част',
      'ремонт',
      'строительств',
      'видеонаблюден',
      'канцеляр',
      'компьютер',
      'принтер',
      'картридж',
      'бензин',
      'дизель',
      'мебель'
    ]
  },
  arto: {
    keywords: [
      'кухонн',
      'ресторан',
      'кафе',
      'столов',
      'пищеблок',
      'общепит',
      'технологическ',
      'теплов',
      'газов',
      'электрическ',
      'плита',
      'печь',
      'печи',
      'пароконвектомат',
      'жарочн',
      'пищеварочн',
      'котел',
      'мармит',
      'фритюр',
      'гриль',
      'кипятильник',
      'посудомоеч',
      'кофемаш',
      'кофе-маш',
      'кофемол',
      'водоумяг',
      'раздач',
      'нейтральн',
      'производственн стол',
      'моечн',
      'стеллаж',
      'зонт вентиляц',
      'гастроемк',
      'мясоруб',
      'овощерез',
      'слайсер',
      'миксер',
      'блендер',
      'соковыжим',
      'тестомес',
      'хлебопек',
      'пекарн',
      'расстоеч',
      'противн',
      'холодильн',
      'морозильн',
      'витрин',
      'ларь',
      'ледогенератор',
      'шоков',
      'прачечн',
      'стиральн',
      'сушильн',
      'гладильн',
      'химчист',
      'профессиональн хим',
      'моющ',
      'дезинфек',
      'озонатор',
      'весоизмер',
      'весы',
      'запасн',
      'запчаст',
      'комплектующ',
      'horeca'
    ],
    negativeKeywords: [
      'бензин',
      'дизель',
      'канцеляр',
      'бумага',
      'строительств',
      'ремонт дорог',
      'асфальт',
      'видеонаблюден',
      'компьютер',
      'принтер',
      'картридж'
    ]
  }
};

export function matchRelevanceProfile(profileName, item, extraKeywords = []) {
  const profile = PROFILES[profileName];
  if (!profile) {
    return {
      isMatch: false,
      matchedKeywords: [],
      negativeMatches: [],
      unknownProfile: true
    };
  }

  const text = normalize(
    [
      item.title,
      item.description,
      item.number,
      item.companyName,
      item.type,
      item.method,
      item.status
    ].join(' ')
  );

  const positiveKeywords = [...profile.keywords, ...extraKeywords.map(normalize)];
  const matchedKeywords = positiveKeywords.filter((keyword) => text.includes(keyword));
  const negativeMatches = profile.negativeKeywords.filter((keyword) => text.includes(keyword));

  return {
    isMatch: matchedKeywords.length > 0 && negativeMatches.length === 0,
    matchedKeywords,
    negativeMatches,
    unknownProfile: false
  };
}

function normalize(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
    .trim();
}
