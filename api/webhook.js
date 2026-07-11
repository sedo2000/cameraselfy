const axios = require('axios');

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

// ============================================
// 📨 دالة إرسال رسالة
// ============================================
async function sendMessage(chatId, text) {
    try {
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            chat_id: chatId,
            text: text,
            parse_mode: 'Markdown'
        });
        return { success: true };
    } catch {
        return { success: false };
    }
}

// ============================================
// 🌐 المعالج الرئيسي
// ============================================
module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // ============================================
    // 📊 API: جلب الإحصائيات
    // ============================================
    if (req.method === 'GET' && req.url === '/api/stats') {
        return res.status(200).json({
            success: true,
            users: 0,
            buttons: 0,
            pins: 0,
            status: '🟢 يعمل'
        });
    }

    // ============================================
    // 📊 API: جلب الأزرار
    // ============================================
    if (req.method === 'GET' && req.url === '/api/buttons') {
        return res.status(200).json({
            success: true,
            buttons: []
        });
    }

    // ============================================
    // ➕ API: إضافة زر
    // ============================================
    if (req.method === 'POST' && req.url === '/api/buttons/add') {
        const { text, url, icon } = req.body;
        if (!text || !url) {
            return res.status(400).json({ success: false, error: 'الاسم والرابط مطلوبان' });
        }
        return res.status(200).json({
            success: true,
            button: {
                id: `btn_${Date.now()}`,
                text,
                url,
                icon: icon || '🔗'
            }
        });
    }

    // ============================================
    // 📢 API: إرسال بث
    // ============================================
    if (req.method === 'POST' && req.url === '/api/broadcast') {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ success: false, error: 'الرسالة مطلوبة' });
        }
        return res.status(200).json({ success: true, sent: 1 });
    }

    // ============================================
    // 📌 API: تثبيت رسالة
    // ============================================
    if (req.method === 'POST' && req.url === '/api/pin') {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ success: false, error: 'الرسالة مطلوبة' });
        }
        return res.status(200).json({
            success: true,
            pin: {
                id: `pin_${Date.now()}`,
                message,
                date: new Date().toISOString()
            }
        });
    }

    // ============================================
    // 🤖 Webhook من تليجرام
    // ============================================
    if (req.method === 'POST') {
        try {
            const update = req.body;

            if (update.message) {
                const message = update.message;
                const chatId = message.chat.id;
                const text = message.text || '';

                if (text === '/start') {
                    await sendMessage(chatId, '🎉 مرحباً بك في البوت!');
                }

                if (text === '/admin' && chatId.toString() === CHAT_ID?.toString()) {
                    await sendMessage(chatId, '🔐 لوحة تحكم المطور');
                }
            }

            return res.status(200).json({ ok: true });
        } catch (error) {
            return res.status(200).json({ ok: false });
        }
    }

    // ============================================
    // 🏠 GET
    // ============================================
    if (req.method === 'GET') {
        return res.status(200).json({
            status: '✅ البوت يعمل!',
            message: 'لوحة التحكم متاحة على /dashboard.html'
        });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
};
