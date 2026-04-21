'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');

dotenv.config();

const {
  PORT = '3001',
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  ALLOWED_ORIGIN = 'https://kom1t.ru'
} = process.env;

const missingEnv = [];
if (!TELEGRAM_BOT_TOKEN) {
  missingEnv.push('TELEGRAM_BOT_TOKEN');
}
if (!TELEGRAM_CHAT_ID) {
  missingEnv.push('TELEGRAM_CHAT_ID');
}

if (missingEnv.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnv.join(', ')}`);
}

const app = express();
app.set('trust proxy', 1);

const allowedOrigins = new Set(
  ALLOWED_ORIGIN
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
);

const requestLogger = (request, response, next) => {
  const startedAt = Date.now();
  response.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${request.method} ${request.originalUrl} ${response.statusCode} ${durationMs}ms`);
  });
  next();
};

app.use(requestLogger);
app.use(helmet());
app.use('/api', cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('CORS_ORIGIN_NOT_ALLOWED'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  maxAge: 86400
}));
app.use(express.json({ limit: '10kb' }));

const leadsRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler(_request, response) {
    response.status(429).json({
      ok: false,
      error: 'RATE_LIMIT',
      message: 'Слишком много запросов. Попробуйте снова через 10 минут.'
    });
  }
});

const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 80;
const PHONE_MAX_LENGTH = 32;
const SOURCE_MAX_LENGTH = 32;

const sanitizeName = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const sanitizePhone = (value) => String(value || '').trim();
const sanitizeSource = (value) => String(value || 'website').trim().toLowerCase();
const digitsOnly = (value) => String(value || '').replace(/\D/g, '');

const normalizeRuPhoneDigits = (phone) => {
  let digits = digitsOnly(phone);

  if (!digits) {
    return '';
  }

  if (digits.length === 10) {
    digits = `7${digits}`;
  } else if (digits.length === 11 && digits[0] === '8') {
    digits = `7${digits.slice(1)}`;
  }

  if (digits.length !== 11 || digits[0] !== '7') {
    return '';
  }

  return digits;
};

const formatRuPhone = (normalizedDigits) => {
  const local = normalizedDigits.slice(1);
  return `+7 (${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6, 8)}-${local.slice(8, 10)}`;
};

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (symbol) => {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    '\'': '&#39;'
  };
  return map[symbol] || symbol;
});

const formatLocalTime = (date) => new Intl.DateTimeFormat('ru-RU', {
  timeZone: 'Europe/Moscow',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
}).format(date);

const validateLeadPayload = (payload) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { error: 'Тело запроса должно быть JSON-объектом.' };
  }

  const name = sanitizeName(payload.name);
  const phoneRaw = sanitizePhone(payload.phone);
  const source = sanitizeSource(payload.source);

  if (name.length < NAME_MIN_LENGTH || name.length > NAME_MAX_LENGTH) {
    return { error: 'Имя должно быть от 2 до 80 символов.' };
  }

  if (!phoneRaw || phoneRaw.length > PHONE_MAX_LENGTH) {
    return { error: 'Телефон имеет некорректную длину.' };
  }

  if (!/^[+\d()\-\s]+$/.test(phoneRaw)) {
    return { error: 'Телефон содержит недопустимые символы.' };
  }

  const normalizedPhoneDigits = normalizeRuPhoneDigits(phoneRaw);
  if (!normalizedPhoneDigits) {
    return { error: 'Телефон должен быть в формате российского номера.' };
  }

  if (!source || source.length > SOURCE_MAX_LENGTH || source !== 'website') {
    return { error: 'Источник заявки указан некорректно.' };
  }

  return {
    value: {
      name,
      phone: formatRuPhone(normalizedPhoneDigits),
      source
    }
  };
};

const sendLeadToTelegram = async (lead) => {
  const now = new Date();
  const utcTime = now.toISOString();
  const localTime = formatLocalTime(now);

  const messageLines = [
    '<b>Новая заявка с kom1t.ru</b>',
    '',
    `Имя: ${escapeHtml(lead.name)}`,
    `Телефон: ${escapeHtml(lead.phone)}`,
    `Источник: ${escapeHtml(lead.source)}`,
    `UTC: ${escapeHtml(utcTime)}`,
    `Europe/Moscow: ${escapeHtml(localTime)}`
  ];

  const telegramResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: messageLines.join('\n'),
      parse_mode: 'HTML',
      disable_web_page_preview: true
    })
  });

  const telegramPayload = await telegramResponse.json().catch(() => null);

  if (!telegramResponse.ok || !telegramPayload || telegramPayload.ok !== true) {
    const error = new Error('Telegram API rejected request');
    error.telegramStatus = telegramResponse.status;
    throw error;
  }
};

app.get('/api/health', (_request, response) => {
  response.status(200).json({
    ok: true,
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/leads', leadsRateLimiter, async (request, response) => {
  const validationResult = validateLeadPayload(request.body);

  if (!validationResult.value) {
    response.status(400).json({
      ok: false,
      error: 'VALIDATION_ERROR',
      message: validationResult.error
    });
    return;
  }

  try {
    await sendLeadToTelegram(validationResult.value);
    response.status(200).json({ ok: true });
  } catch (error) {
    const timestamp = new Date().toISOString();
    const statusCode = error && error.telegramStatus ? error.telegramStatus : 'unknown';
    console.error(`[${timestamp}] telegram_send_failed status=${statusCode} route=/api/leads`);

    response.status(502).json({
      ok: false,
      error: 'TELEGRAM_UNAVAILABLE',
      message: 'Сервис отправки временно недоступен.'
    });
  }
});

app.use((error, request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  if (error && error.message === 'CORS_ORIGIN_NOT_ALLOWED') {
    response.status(403).json({
      ok: false,
      error: 'CORS_DENIED',
      message: 'Доступ запрещен для указанного источника.'
    });
    return;
  }

  if (error && error.type === 'entity.too.large') {
    response.status(413).json({
      ok: false,
      error: 'PAYLOAD_TOO_LARGE',
      message: 'Размер запроса превышает допустимый лимит.'
    });
    return;
  }

  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    response.status(400).json({
      ok: false,
      error: 'INVALID_JSON',
      message: 'Некорректный JSON в теле запроса.'
    });
    return;
  }

  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] internal_error route=${request.originalUrl}`);
  response.status(500).json({
    ok: false,
    error: 'INTERNAL_ERROR',
    message: 'Внутренняя ошибка сервера.'
  });
});

app.listen(Number(PORT), () => {
  console.log(`[startup] backend is running on port ${PORT}`);
});
