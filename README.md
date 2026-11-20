# MacraSMS Node.js SDK

Official Node.js SDK for [MacraSMS](https://macrasms.com), bulk SMS for Kenyan businesses: send to one number or thousands under your own sender ID, check your credit balance and follow each message's status.

## Before you start

1. Create an account at [sms.macrasms.com](https://sms.macrasms.com/signup/) and buy credits (from KES 1 by M-Pesa or card).
2. Apply for your own sender ID on the **Sender IDs** page. Once it is approved you get an **API key** for it. The API works with your own approved sender ID, not the shared Macra one.
3. Want to try it first? Use your free sandbox test key (see [Testing with the sandbox](#testing-with-the-sandbox)); no sender ID or credits needed.
4. Keep the API key secret: load it from an environment variable, never commit it.

## Install

```bash
npm install github:macrasystems-star/macrasms-node
```

Node.js 18 or newer, no dependencies. Works with `import` and `require`, and includes TypeScript types.

## Quick start

```js
import { Client } from 'macrasms';

const sms = new Client(process.env.MACRASMS_SENDER_ID, process.env.MACRASMS_API_KEY);

const result = await sms.send('0712345678', 'Your order is ready for collection.');
console.log(result.messageId, result.creditsDeducted, result.balanceRemaining);

// Many recipients at once
await sms.send(['0712345678', '0722000111'], 'Members meeting on Saturday at 10am.');

console.log(await sms.balance());                                  // credits left
console.log((await sms.messageStatus(result.messageId)).status);
```

With CommonJS: `const { Client } = require('macrasms');`

## Testing with the sandbox

Every MacraSMS account has a free **test key** (it starts with `test_`) on the [Developer Sandbox](https://sms.macrasms.com/sandbox/) page, available right after sign up, before your sender ID is approved. Use it in place of your API key: this library works exactly the same, but no SMS is sent and no real credit is used. Test sends come out of a separate sandbox balance of 1,000 credits that you can reset at any time, and you can use any sender ID of 3 to 11 letters or numbers.

```js
const sms = new Client('MYCOMPANY', process.env.MACRASMS_TEST_KEY);   // test_...
const result = await sms.send(['0712345678', '254700000001'], 'Testing my integration');
// a few seconds later: (await sms.messageStatus(result.messageId)).status === 'partial'
```

| Test number | Result |
|---|---|
| `254700000001` | This recipient fails (alone: `failed`, with others: `partial`) |
| `254700000402` | Refused with 402, raises the insufficient balance error |
| `254700000429` | Refused with 429, raises the rate limit error |
| Any other number | Succeeds, status becomes `sent` after about 3 seconds |

To go live, swap the test key for the API key of your approved sender ID. Details: [API docs, Sandbox](https://macrasms.com/api-docs/#sandbox).

## Handling errors

```js
import { InsufficientBalanceError, AuthenticationError, RateLimitError } from 'macrasms';

try {
  await sms.send('0712345678', 'Hello');
} catch (e) {
  if (e instanceof InsufficientBalanceError) console.log('Top up: need', e.required, 'have', e.available);
  else if (e instanceof AuthenticationError) console.log('Check the sender ID and API key');
  else if (e instanceof RateLimitError) console.log('Retry in', e.retryAfter, 'seconds');
  else throw e;
}
```

## Errors

| HTTP | Node.js error | Meaning |
|---|---|---|
| 400 | `ValidationError` | A required value is missing or invalid |
| 401 | `AuthenticationError` | The sender ID and API key do not match an approved sender ID |
| 402 | `InsufficientBalanceError` | Not enough credits (includes the credits required and available) |
| 403 | `AccountSuspendedError` | The account is suspended |
| 404 | `NotFoundError` | The message does not exist or belongs to another account |
| 429 | `RateLimitError` | Too many requests; wait the number of seconds given |
| other | `ApiError` | Any other API or network problem |

## Credits and message length

One SMS holds up to 160 characters. Longer messages are sent in parts of 153 characters and each part uses one credit per recipient. Messages with emoji or characters outside the standard SMS alphabet hold 70 characters, or 67 per part. `segments(text)` tells you how many parts a message will use before you send it.

## Message status

`pending` means queued, then `sent`, `partial` (some recipients failed) or `failed`. Messages are usually sent within seconds.

## Links

- API documentation: https://macrasms.com/api-docs/
- Pricing and sign up: https://macrasms.com
- Support: info@macrasystems.com

## Licence

MIT, Copyright (c) 2026 Macra Systems Ltd.

## Running the tests

```bash
npm test
```
