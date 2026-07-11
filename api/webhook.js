// api/webhook.js
module.exports = async (req, res) => {
  console.log('📩 وصول طلب:', req.method, req.url);
  
  // هذا الرد مهم جدًا ليقبل تليجرام الطلب
  if (req.method === 'POST') {
    try {
      const update = req.body;
      console.log('📦 البيانات:', JSON.stringify(update).slice(0, 200));
      
      // رد بسيط جدًا لأي رسالة
      const chatId = update.message?.chat?.id;
      if (chatId) {
        await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: '✅ البوت يعمل! تم استلام رسالتك.'
          })
        });
      }
      
      // تليجرام ينتظر 200 OK فقط
      return res.status(200).json({ ok: true });
      
    } catch (error) {
      console.error('❌ خطأ:', error.message);
      return res.status(200).json({ ok: false }); // حتى في الخطأ، نرد 200
    }
  }
  
  // لأي طلب GET، نرد بكشف بسيط
  if (req.method === 'GET') {
    return res.status(200).json({ 
      status: '✅ البوت يعمل!',
      webhook: '/api/webhook',
      time: new Date().toISOString()
    });
  }
  
  return res.status(405).json({ error: 'Method Not Allowed' });
};
