const crypto = require('node:crypto');
const { Client, segments } = require('macrasms');

const sms = new Client(process.env.MACRASMS_SENDER_ID, process.env.MACRASMS_API_KEY);
const code = String(crypto.randomInt(0, 1e6)).padStart(6, '0');
const text = `Your verification code is ${code}. It expires in 10 minutes.`;
console.log('This SMS uses', segments(text), 'credit(s) per recipient');
sms.send('0712345678', text).then((r) => console.log('Queued', r.messageId));
