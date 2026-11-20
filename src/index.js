'use strict';
/** Official Node.js SDK for the MacraSMS bulk SMS API (https://macrasms.com). No dependencies. */

const DEFAULT_BASE_URL = 'https://sms.macrasms.com/api/v1/';
const VERSION = '1.0.0';

class MacraSMSError extends Error {
  constructor(message, status = 0, body = {}) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.body = body || {};
  }
}
class ApiError extends MacraSMSError {}
class ValidationError extends MacraSMSError { get details() { return this.body.details || []; } }
class AuthenticationError extends MacraSMSError {}
class InsufficientBalanceError extends MacraSMSError {
  get required() { return this.body.required ?? null; }
  get available() { return this.body.available ?? this.body.balance ?? null; }
  get messageId() { return this.body.message_id ?? null; }
}
class AccountSuspendedError extends MacraSMSError {}
class NotFoundError extends MacraSMSError {}
class RateLimitError extends MacraSMSError { get retryAfter() { return this.body.retry_after ?? null; } }

const ERRORS = { 400: ValidationError, 401: AuthenticationError, 402: InsufficientBalanceError,
  403: AccountSuspendedError, 404: NotFoundError, 429: RateLimitError };

const GSM_BASIC = new Set('@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\x1bÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà');
const GSM_EXTENDED = new Set('^{}\\[~]|€');

/** SMS parts (credits per recipient), the same rules MacraSMS charges by. */
function segments(text) {
  if (text === '') return 1;
  const chars = Array.from(text); // code points, like PHP mb_strlen
  if (chars.every((c) => GSM_BASIC.has(c) || GSM_EXTENDED.has(c))) {
    const units = chars.reduce((n, c) => n + (GSM_EXTENDED.has(c) ? 2 : 1), 0);
    return units <= 160 ? 1 : Math.ceil(units / 153);
  }
  return chars.length <= 70 ? 1 : Math.ceil(chars.length / 67);
}

class Client {
  /**
   * @param {string} senderId your approved sender ID
   * @param {string} apiKey the API key for that sender ID
   * @param {{baseUrl?: string, timeout?: number, fetch?: Function}} [options]
   */
  constructor(senderId, apiKey, options = {}) {
    if (!senderId || !apiKey) throw new TypeError('senderId and apiKey are required');
    this.senderId = senderId;
    this.apiKey = apiKey;
    this.baseUrl = (options.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '') + '/';
    this.timeout = options.timeout ?? 30000;
    this._fetch = options.fetch || globalThis.fetch;
    if (typeof this._fetch !== 'function') throw new TypeError('fetch is not available: use Node 18+ or pass options.fetch');
  }

  /** Queue a message to one number or many (array or comma separated string). */
  async send(to, message) {
    const recipients = Array.isArray(to) ? to.map((n) => String(n).trim()).join(',') : String(to || '');
    if (!recipients.trim()) throw new TypeError('at least one recipient is required');
    if (!message) throw new TypeError('message is required');
    const d = await this._request('POST', '', { recipients, message_text: message });
    return { messageId: d.message_id, status: d.status, senderId: d.sender_id, totalRecipients: d.total_recipients,
      segmentsPerMessage: d.segments_per_message, creditsDeducted: d.credits_deducted, balanceRemaining: d.balance_remaining, raw: d };
  }

  /** Credits left on the account that owns this sender ID. */
  async balance() {
    return Number((await this._request('GET', 'balance/')).balance);
  }

  /** Status of a message this account sent: pending, sent, partial or failed. */
  async messageStatus(messageId) {
    const d = await this._request('GET', 'messages/', { id: Number(messageId) });
    return { messageId: d.message_id, senderId: d.sender_id, status: d.status, totalRecipients: d.total_recipients,
      successfulCount: d.successful_count, failedCount: d.failed_count, createdAt: d.created_at, sentAt: d.sent_at, raw: d };
  }

  async _request(method, path, params) {
    let url = this.baseUrl + path;
    const headers = { Authorization: 'Bearer ' + this.apiKey, 'X-Sender-Id': this.senderId,
      Accept: 'application/json', 'User-Agent': 'macrasms-node/' + VERSION };
    const init = { method, headers };
    if (method === 'GET') {
      if (params) url += '?' + new URLSearchParams(params).toString();
    } else {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(params || {});
    }
    const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), this.timeout) : null;
    if (ctrl) init.signal = ctrl.signal;
    let res;
    let text;
    try {
      res = await this._fetch(url, init);
      text = await res.text();
    } catch (e) {
      throw new ApiError('Could not reach MacraSMS: ' + (e && e.message ? e.message : e));
    } finally {
      if (timer) clearTimeout(timer);
    }
    let body;
    try { body = text ? JSON.parse(text) : {}; } catch (e) {
      throw new ApiError('MacraSMS returned a non JSON reply (HTTP ' + res.status + ')', res.status);
    }
    if (res.status >= 200 && res.status < 300 && body.success) return body;
    const Err = ERRORS[res.status] || ApiError;
    throw new Err(body.error || 'HTTP ' + res.status, res.status, body);
  }
}

module.exports = { Client, segments, VERSION, MacraSMSError, ApiError, ValidationError, AuthenticationError,
  InsufficientBalanceError, AccountSuspendedError, NotFoundError, RateLimitError };
