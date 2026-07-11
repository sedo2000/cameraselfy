const axios = require('axios');

// ============================================
// 🔑 متغيرات البيئة
// ============================================
const BOT_TOKEN = process.env.BOT_TOKEN;
const DEV_CHAT_ID = process.env.CHAT_ID; // معرف المطور

// ============================================
// 📊 قاعدة البيانات المؤقتة (في الذاكرة)
// ============================================
let data = {
    buttons: [],        // الأزرار التي تظهر للمستخدمين
    users: [],          // قائمة المستخدمين
    pins: [],           // الرسائل المثبتة
    stats: { messages: 0 }
};

// ============================================
// 📨 دوال الإرسال
// ============================================
async function sendMessage(chatId, text, keyboard = null) {
    try {
        const payload = {
            chat_id: chatId,
            text: text,
            parse_mode: 'Markdown',
            disable_web_page_preview: true
        };
        if (keyboard) payload.reply_markup = { inline_keyboard: keyboard };
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, payload);
        return { success: true };
    } catch (error) {
        console.error('❌ فشل الإرسال:', error.message);
        return { success: false };
    }
}

async function sendVideo(chatId, videoUrl, caption, keyboard = null) {
    try {
        const payload = {
            chat_id: chatId,
            video: videoUrl,
            caption: caption,
            parse_mode: 'Markdown'
        };
        if (keyboard) payload.reply_markup = { inline_keyboard: keyboard };
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendVideo`, payload);
        return { success: true };
    } catch (error) {
        console.error('❌ فشل إرسال الفيديو:', error.message);
        return { success: false };
    }
}

// ============================================
// 🧠 معالجة الأوامر القادمة من الأزرار (Callback Query)
// ============================================
async function handleCallback(query) {
    const chatId = query.message.chat.id;
    const dataQuery = query.data; // مثلاً: "add_btn", "list_btns", إلخ

    // التأكد من أن المستخدم هو المطور
    if (chatId.toString() !== DEV_CHAT_ID?.toString()) {
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
            callback_query_id: query.id,
            text: '⛔ هذا الأمر للمطور فقط!',
            show_alert: true
        });
        return;
    }

    // ==========================================
    // 1️⃣ عرض لوحة التحكم (الأزرار الرئيسية)
    // ==========================================
    if (dataQuery === 'admin_panel') {
        const keyboard = [
            [{ text: '➕ إضافة زر', callback_data: 'add_btn' }],
            [{ text: '📋 عرض الأزرار', callback_data: 'list_btns' }],
            [{ text: '🗑️ حذف زر', callback_data: 'delete_btn' }],
            [{ text: '📢 إرسال إعلان', callback_data: 'broadcast' }],
            [{ text: '📌 تثبيت رسالة', callback_data: 'pin_msg' }],
            [{ text: '📌 عرض المثبتات', callback_data: 'list_pins' }],
            [{ text: '👥 المستخدمين', callback_data: 'list_users' }],
            [{ text: '📊 الإحصائيات', callback_data: 'stats' }],
            [{ text: '🔙 رجوع', callback_data: 'back_to_start' }]
        ];
        await sendMessage(chatId, '🔐 **لوحة تحكم المطور**\nاختر الإجراء المطلوب:', keyboard);
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
            callback_query_id: query.id
        });
        return;
    }

    // ==========================================
    // 2️⃣ إضافة زر (يطلب من المطور إدخال البيانات)
    // ==========================================
    if (dataQuery === 'add_btn') {
        await sendMessage(chatId, `
➕ **إضافة زر جديد**

أرسل البيانات بهذه الصيغة:
\`الاسم | الرابط | الإيموجي\`

مثال:
\`موقعي | https://example.com | 🌐\`
        `);
        // تخزين مؤقت لمعرفة أن المطور في وضع الإضافة
        data.temp_action = { chatId, action: 'adding' };
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
            callback_query_id: query.id
        });
        return;
    }

    // ==========================================
    // 3️⃣ عرض الأزرار
    // ==========================================
    if (dataQuery === 'list_btns') {
        if (data.buttons.length === 0) {
            await sendMessage(chatId, '📭 لا توجد أزرار حالياً.');
        } else {
            let text = '📋 **قائمة الأزرار:**\n\n';
            data.buttons.forEach((btn, i) => {
                text += `${i+1}. *${btn.text}*\n🆔 \`${btn.id}\`\n🔗 ${btn.url}\n\n`;
            });
            await sendMessage(chatId, text);
        }
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
            callback_query_id: query.id
        });
        return;
    }

    // ==========================================
    // 4️⃣ حذف زر (يطلب ID)
    // ==========================================
    if (dataQuery === 'delete_btn') {
        await sendMessage(chatId, `
🗑️ **حذف زر**

أرسل ID الزر الذي تريد حذفه.
لعرض الأ IDs استخدم /list

مثال:
\`btn_1234567890\`
        `);
        data.temp_action = { chatId, action: 'deleting' };
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
            callback_query_id: query.id
        });
        return;
    }

    // ==========================================
    // 5️⃣ إرسال إعلان
    // ==========================================
    if (dataQuery === 'broadcast') {
        await sendMessage(chatId, `
📢 **إرسال إعلان للجميع**

أرسل نص الإعلان:
        `);
        data.temp_action = { chatId, action: 'broadcasting' };
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
            callback_query_id: query.id
        });
        return;
    }

    // ==========================================
    // 6️⃣ تثبيت رسالة
    // ==========================================
    if (dataQuery === 'pin_msg') {
        await sendMessage(chatId, `
📌 **تثبيت رسالة**

أرسل النص الذي تريد تثبيته:
        `);
        data.temp_action = { chatId, action: 'pinning' };
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
            callback_query_id: query.id
        });
        return;
    }

    // ==========================================
    // 7️⃣ عرض المثبتات
    // ==========================================
    if (dataQuery === 'list_pins') {
        if (data.pins.length === 0) {
            await sendMessage(chatId, '📌 لا توجد رسائل مثبتة.');
        } else {
            let text = '📌 **الرسائل المثبتة:**\n\n';
            data.pins.forEach((pin, i) => {
                text += `${i+1}. ${pin.message}\n🆔 \`${pin.id}\`\n📅 ${new Date(pin.date).toLocaleString()}\n\n`;
            });
            await sendMessage(chatId, text);
        }
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
            callback_query_id: query.id
        });
        return;
    }

    // ==========================================
    // 8️⃣ عرض المستخدمين
    // ==========================================
    if (dataQuery === 'list_users') {
        if (data.users.length === 0) {
            await sendMessage(chatId, '👥 لا يوجد مستخدمون.');
        } else {
            let text = '👥 **قائمة المستخدمين:**\n\n';
            data.users.forEach((user, i) => {
                text += `${i+1}. ${user.first_name || 'مستخدم'}\n🆔 \`${user.id}\`\n📅 ${new Date(user.joined_date).toLocaleString()}\n\n`;
            });
            await sendMessage(chatId, text);
        }
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
            callback_query_id: query.id
        });
        return;
    }

    // ==========================================
    // 9️⃣ الإحصائيات
    // ==========================================
    if (dataQuery === 'stats') {
        const text = `
📊 **إحصائيات البوت:**

👥 المستخدمين: ${data.users.length}
📊 الأزرار: ${data.buttons.length}
📌 المثبتات: ${data.pins.length}
📨 رسائل مرسلة: ${data.stats.messages || 0}
📅 آخر تحديث: ${new Date().toLocaleString()}
        `;
        await sendMessage(chatId, text);
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
            callback_query_id: query.id
        });
        return;
    }

    // ==========================================
    // 🔙 رجوع إلى /start
    // ==========================================
    if (dataQuery === 'back_to_start') {
        await handleStart(chatId);
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
            callback_query_id: query.id
        });
        return;
    }

    // ==========================================
    // افتراضي
    // ==========================================
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
        callback_query_id: query.id,
        text: '⚠️ أمر غير معروف',
        show_alert: false
    });
}

// ==========================================
// 🏠 معالجة أمر /start
// ==========================================
async function handleStart(chatId) {
    const videoUrl = 'https://od.lk/s/M18zMzA4NzgzNDNf/%40VideoToGifConverterBot.mp4';
    const caption = `
🎬 **مرحباً بك في البوت!**

👤 مرحباً بك في البوت!
📌 استمتع بالمحتوى.
    `;

    // الزر الشفاف المطلوب (بدون رابط، للإشعار فقط)
    const keyboard = [
        [{ text: '⚠️ تم إيقاف البوت الإباحي', callback_data: 'warning' }]
    ];

    // إرسال الفيديو مع الزر
    await sendVideo(chatId, videoUrl, caption, keyboard);

    // إذا كان المستخدم هو المطور، نرسل له أزرار الإدارة بعد الفيديو
    if (chatId.toString() === DEV_CHAT_ID?.toString()) {
        const adminKeyboard = [
            [{ text: '🔐 لوحة التحكم', callback_data: 'admin_panel' }]
        ];
        await sendMessage(chatId, '🔐 **لوحة المطور**\nاضغط للوصول إلى الإدارة:', adminKeyboard);
    }
}

// ==========================================
// 🌐 المعالج الرئيسي
// ==========================================
module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'POST') {
        try {
            const update = req.body;

            // ==========================================
            // 1️⃣ معالجة الضغط على الأزرار (Callback Query)
            // ==========================================
            if (update.callback_query) {
                await handleCallback(update.callback_query);
                return res.status(200).json({ ok: true });
            }

            // ==========================================
            // 2️⃣ معالجة الرسائل النصية
            // ==========================================
            if (update.message) {
                const msg = update.message;
                const chatId = msg.chat.id;
                const text = msg.text || '';
                const firstName = msg.from?.first_name || 'مستخدم';

                console.log(`💬 رسالة من ${chatId}: "${text}"`);

                // تسجيل المستخدم
                const existing = data.users.find(u => u.id === chatId);
                if (!existing) {
                    data.users.push({
                        id: chatId,
                        first_name: firstName,
                        joined_date: new Date().toISOString()
                    });
                }

                // ==========================================
                // أمر /start
                // ==========================================
                if (text === '/start') {
                    await handleStart(chatId);
                    return res.status(200).json({ ok: true });
                }

                // ==========================================
                // معالجة الإجراءات المؤقتة (للمطور فقط)
                // ==========================================
                if (chatId.toString() === DEV_CHAT_ID?.toString() && data.temp_action?.chatId === chatId) {
                    const action = data.temp_action.action;

                    // إضافة زر
                    if (action === 'adding') {
                        const parts = text.split('|').map(s => s.trim());
                        if (parts.length >= 2) {
                            const newBtn = {
                                id: `btn_${Date.now()}`,
                                text: parts[0] || 'زر جديد',
                                url: parts[1] || 'https://example.com',
                                icon: parts[2] || '🔗'
                            };
                            data.buttons.push(newBtn);
                            await sendMessage(chatId, `✅ **تم إضافة الزر!**\n📌 ${newBtn.text}\n🆔 \`${newBtn.id}\``);
                        } else {
                            await sendMessage(chatId, `❌ **صيغة خاطئة!**\nاستخدم: \`الاسم | الرابط | الإيموجي\``);
                        }
                        delete data.temp_action;
                        return res.status(200).json({ ok: true });
                    }

                    // حذف زر
                    if (action === 'deleting') {
                        const id = text.trim();
                        const filtered = data.buttons.filter(b => b.id !== id);
                        if (filtered.length === data.buttons.length) {
                            await sendMessage(chatId, `❌ الزر \`${id}\` غير موجود.`);
                        } else {
                            data.buttons = filtered;
                            await sendMessage(chatId, `✅ **تم حذف الزر!**\n🆔 \`${id}\``);
                        }
                        delete data.temp_action;
                        return res.status(200).json({ ok: true });
                    }

                    // إرسال إعلان
                    if (action === 'broadcasting') {
                        await sendMessage(chatId, `⏳ جاري إرسال الإعلان لـ ${data.users.length} مستخدم...`);
                        let sent = 0;
                        for (const user of data.users) {
                            const result = await sendMessage(user.id, `📢 **إعلان من المطور:**\n\n${text}`);
                            if (result.success) sent++;
                        }
                        data.stats.messages = (data.stats.messages || 0) + 1;
                        await sendMessage(chatId, `✅ **تم الإرسال!**\n📨 ${sent} مستخدم`);
                        delete data.temp_action;
                        return res.status(200).json({ ok: true });
                    }

                    // تثبيت رسالة
                    if (action === 'pinning') {
                        const pin = {
                            id: `pin_${Date.now()}`,
                            message: text,
                            date: new Date().toISOString()
                        };
                        data.pins.unshift(pin);
                        if (data.pins.length > 10) data.pins = data.pins.slice(0, 10);
                        await sendMessage(chatId, `📌 **تم التثبيت!**\n🆔 \`${pin.id}\``);
                        delete data.temp_action;
                        return res.status(200).json({ ok: true });
                    }
                }

                // ==========================================
                // رسالة عادية
                // ==========================================
                await sendMessage(chatId, `👋 مرحباً!\n📌 أرسل /start للبدء.`);
            }

            return res.status(200).json({ ok: true });
        } catch (error) {
            console.error('❌ خطأ:', error.message);
            return res.status(200).json({ ok: false });
        }
    }

    if (req.method === 'GET') {
        return res.status(200).json({
            status: '✅ البوت يعمل!',
            webhook: '/api/webhook',
            buttons: data.buttons.length,
            users: data.users.length
        });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
};
