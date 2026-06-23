# Telegram-уведомления о новых госзакупках

Небольшой мониторинг для портала `goszakupki.okmot.kg`: сервис периодически проверяет публичный API, запоминает уже найденные заявки и отправляет новые релевантные объявления в Telegram.

Один процесс может отправлять объявления в две разные Telegram-группы:

- `ARTO_CHAT_ID` получает профиль `arto`: кухонное, холодильное, прачечное, хлебопекарное оборудование, химия, запчасти.
- `CATERING_CHAT_ID` получает профиль `catering`: услуги питания, столовые, готовые обеды, представительские расходы и продукты питания.

## Настройка

1. Создайте бота через `@BotFather` и получите `TELEGRAM_BOT_TOKEN`.
2. Узнайте свой `TELEGRAM_CHAT_ID`. Самый простой способ: написать боту любое сообщение и открыть:

   `https://api.telegram.org/bot<ТОКЕН>/getUpdates`

3. Скопируйте `.env.example` в `.env` и заполните:

   ```env
   TELEGRAM_BOT_TOKEN=...
   ARTO_CHAT_ID=-100...
   CATERING_CHAT_ID=-100...
   ```

4. Установите зависимости:

   ```powershell
   npm install
   npx playwright install chromium
   ```

5. Запустите:

   ```powershell
   npm start
   ```

При первом запуске сервис только сохранит текущие заявки, чтобы не засыпать чат старыми уведомлениями. Со второго прохода будут приходить новые.

## Две Группы

В `.env` уже можно оставить:

```env
ARTO_CHAT_ID=-100...
CATERING_CHAT_ID=-100...
NOTIFY_ONLY_RELEVANT=true
EXCLUDED_STATUSES=CONTRACT_SIGNED,CANCELLED,CANCELED
```

Так бот будет отдельно отправлять объявления для ARTO и общепита, и не будет слать подписанные/отмененные закупки.

## Дополнительные слова

Чтобы расширить фильтр, добавьте в `.env`:

```env
ARTO_FILTER_KEYWORDS=пароконвектомат,ледогенератор
CATERING_FILTER_KEYWORDS=кейтеринг,горячее питание,готовые обеды
```

## Если портал изменил верстку

Можно настроить селекторы без изменения кода:

```env
ITEM_SELECTOR=tr, .card, [class*="purchase"]
LINK_SELECTOR=a[href]
ORDER_LINK_SELECTOR=a[href*="/public/order/view/"]
```

## Render

Deploy as a Background Worker.

Build Command:

```bash
npm ci
```

Start Command:

```bash
npm start
```

Required environment variables:

```env
TELEGRAM_BOT_TOKEN=...
ARTO_CHAT_ID=...
CATERING_CHAT_ID=...
```
