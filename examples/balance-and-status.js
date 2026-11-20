const { Client } = require('macrasms');

(async () => {
  const sms = new Client(process.env.MACRASMS_SENDER_ID, process.env.MACRASMS_API_KEY);
  console.log('Credits left:', await sms.balance());
  if (process.argv[2]) {
    const st = await sms.messageStatus(process.argv[2]);
    console.log(st.status, 'sent to', st.successfulCount, 'of', st.totalRecipients);
  }
})();
