// api/webhook.js
const axios = require('axios');

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

module.exports = async (req, res) => {
    // 🔹 السماح بـ CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 🔹 معالجة OPTIONS (للـ CORS)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 🔹 GET - اختبار الـ API
    if (req.method === 'GET') {
        return res.status(200).json({
            status: '✅ البوت يعمل!',
            webhook: '/api/webhook'
        });
    }

    // 🔹 POST - استقبال الطلبات
    if (req.method === 'POST') {
        try {
            const body = req.body;
            console.log('📩 وصول POST:', JSON.stringify(body).slice(0, 300));

            // ✅ التحقق: هل الطلب من تليجرام أم من الموقع؟
            // تليجرام يرسل حقل "message"، الموقع يرسل حقل "test" أو "fromSite"
            
            // 1️⃣ إذا كان الطلب من الموقع (يحتوي على fromSite أو test)
            if (body.fromSite || body.test) {
                // إرسال إشعار للمطور
                if (CHAT_ID) {
                    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                        chat_id: CHAT_ID,
                        text: `📸 **تم الوصول للكاميرا من الموقع!**\n🕒 ${new Date().toLocaleString()}\n📱 ${body.userAgent || 'غير معروف'}`
                    });
                }
                
                // رد للموقع
                return res.status(200).json({
                    success: true,
                    message: '✅ تم إرسال الإشعار للمطور'
                });
            }

            // 2️⃣ إذا كان الطلب من تليجرام (يحتوي على message)
            if (body.message) {
                const chatId = body.message.chat.id;
                const text = body.message.text || '';

                console.log(`💬 رسالة من ${chatId}: ${text}`);

                if (text === '/start') {
                    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                        chat_id: chatId,
                        text: `🎉 **مرحباً بك في البوت!**\n✅ البوت يعمل بنجاح.`
                    });
                } else {
                    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                        chat_id: chatId,
                        text: `👋 مرحباً!\n📌 أرسل /start للبدء.`
                    });
                }

                return res.status(200).json({ ok: true });
            }

            // 3️⃣ أي طلب POST آخر
            return res.status(200).json({
                success: true,
                message: 'تم استلام الطلب'
            });

        } catch (error) {
            console.error('❌ خطأ:', error.message);
            // ✅ نرد بـ 200 و JSON دائمًا
            return res.status(200).json({
                success: false,
                error: error.message
            });
        }
    }

    // 🔹 أي طريقة أخرى
    return res.status(405).json({ error: 'Method Not Allowed' });
};
