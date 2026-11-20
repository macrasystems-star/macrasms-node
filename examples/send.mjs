import { Client, InsufficientBalanceError, AuthenticationError } from 'macrasms';

const sms = new Client(process.env.MACRASMS_SENDER_ID, process.env.MACRASMS_API_KEY);
try {
  const r = await sms.send('0712345678', 'Your order is ready for collection.');
  console.log('Queued message', r.messageId, 'credits left:', r.balanceRemaining);
  const bulk = await sms.send(['0712345678', '0722000111'], 'Reminder: members meeting on Saturday at 10am.');
  console.log('Bulk message', bulk.messageId, 'to', bulk.totalRecipients, 'people');
} catch (e) {
  if (e instanceof InsufficientBalanceError) console.log('Top up first. Needed', e.required, 'credits, have', e.available);
  else if (e instanceof AuthenticationError) console.log('Check your sender ID and API key');
  else throw e;
}
