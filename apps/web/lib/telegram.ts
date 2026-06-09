// Минимальный клиент Telegram Bot API: только то, что нужно для нашего бота.
// Токен берём из process.env.BOT_TOKEN на каждом вызове, чтобы реакция
// на ротацию не требовала рестарта serverless-функции.

const API = 'https://api.telegram.org/bot';

function token(): string {
  const t = process.env.BOT_TOKEN;
  if (!t) throw new Error('BOT_TOKEN не задан');
  return t;
}

async function call<T = unknown>(method: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${token()}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await res.json();
  if (!j.ok) throw new Error(`Telegram ${method}: ${j.description ?? res.status}`);
  return j.result as T;
}

export type InlineKeyboard = { text: string; callback_data: string }[][];

export type ReplyKeyboard = {
  keyboard: { text: string }[][];
  resize_keyboard?: boolean;
  is_persistent?: boolean;
};

type Markup =
  | { inline_keyboard: InlineKeyboard }
  | ReplyKeyboard
  | { remove_keyboard: true };

export function sendMessage(
  chatId: number | string,
  text: string,
  opts?: { reply_markup?: Markup },
) {
  return call<{ message_id: number }>('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...(opts?.reply_markup ? { reply_markup: opts.reply_markup } : {}),
  });
}

export function editMessageText(
  chatId: number | string,
  messageId: number,
  text: string,
  opts?: { reply_markup?: { inline_keyboard: InlineKeyboard } },
) {
  return call('editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...(opts?.reply_markup ? { reply_markup: opts.reply_markup } : {}),
  });
}

export function answerCallbackQuery(callbackQueryId: string, text?: string) {
  return call('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    ...(text ? { text } : {}),
  });
}

export function setMyCommands(commands: { command: string; description: string }[]) {
  return call('setMyCommands', { commands });
}

export function setWebhook(url: string, secret?: string) {
  return call('setWebhook', {
    url,
    allowed_updates: ['message', 'callback_query'],
    ...(secret ? { secret_token: secret } : {}),
  });
}

export function deleteWebhook() {
  return call('deleteWebhook', { drop_pending_updates: false });
}

export function getWebhookInfo() {
  return call<{ url: string; pending_update_count: number }>('getWebhookInfo', {});
}

/** Безопасный escape для HTML-разметки Telegram. */
export function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
