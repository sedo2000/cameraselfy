// api/webhook.js
const axios = require('axios');

// 🔑 اقرأ التوكن من متغيرات البيئة
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

// ============================================
// 📨 إرسال رسالة
// ============================================
async function sendMessage(chatId, text) {
    try {
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            chat_id: chatId,
            text: text,
            parse_mode: 'Markdown'
        });
        return true;
    } catch (error) {
        console.error('❌ فشل الإرسال:', error.message);
        return false;
    }
}

// ============================================
// 🌐 المعالج الرئيسي
// ============================================
module.exports = async (req, res) => {
    // 🔹 السماح بـ CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 🔹 معالجة طلبات OPTIONS (للـ CORS)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 🔹 اختبار GET (للتأكد من أن الـ API يعمل)
    if (req.method === 'GET') {
        return res.status(200).json({
            status: '✅ البوت يعمل!',
            webhook: '/api/webhook.js',
            time: new Date().toISOString()
        });
    }

    // 🔹 معالجة POST (من تليجرام)
    if (req.method === 'POST') {
        try {
            const update = req.body;
            console.log('📩 وصول:', JSON.stringify(update).slice(0, 200));

            // التأكد من وجود رسالة
            if (update.message) {
                const chatId = update.message.chat.id;
                const text = update.message.text || '';

                // 👇 أوامر البوت
                if (text === '/start') {
                    await sendMessage(chatId, `
🎉 **مرحباً بك في البوت!**

✅ البوت يعمل بنجاح على Vercel.

📌 استخدم الأزرار أدناه للتنقل.
                    `);
                } else {
                    await sendMessage(chatId, `
👋 مرحباً!

📌 أرسل /start للبدء.
                    `);
                }
            }

            // ✅ رد 200 دائمًا (مهم جدًا لتليجرام)
            return res.status(200).json({ ok: true });

        } catch (error) {
            console.error('❌ خطأ:', error.message);
            // حتى في الخطأ، نرد 200
            return res.status(200).json({ ok: false, error: error.message });
        }
    }

    // 🔹 أي طريقة أخرى
    return res.status(405).json({ error: 'Method Not Allowed' });
};
