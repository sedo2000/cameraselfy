const axios = require('axios');

// ============================================
// 🔑 متغيرات البيئة
// ============================================
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;  // معرف المطور

// ============================================
// 📊 البيانات (مخزنة في الذاكرة)
// ============================================
let data = {
    buttons: [],
    users: [],
    pins: [],
    stats: { messages: 0 }
};

// ============================================
// 📨 دوال إرسال الرسائل
// ============================================
async function sendMessage(chatId, text, buttons = null) {
    try {
        const payload = {
            chat_id: chatId,
            text: text,
            parse_mode: 'Markdown',
            disable_web_page_preview: true
        };

        if (buttons && buttons.length > 0) {
            const inlineKeyboard = buttons.map(btn => [{
                text: btn.icon ? `${btn.icon} ${btn.text}` : btn.text,
                url: btn.url
            }]);
            payload.reply_markup = { inline_keyboard: inlineKeyboard };
        }

        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, payload);
        return { success: true };
    } catch (error) {
        console.error('❌ فشل الإرسال:', error.message);
        return { success: false, error: error.message };
    }
}

async function sendVideoWithButtons(chatId, videoUrl, caption, buttons = null) {
    try {
        const payload = {
            chat_id: chatId,
            video: videoUrl,
            caption: caption,
            parse_mode: 'Markdown'
        };

        if (buttons && buttons.length > 0) {
            const inlineKeyboard = buttons.map(btn => [{
                text: btn.icon ? `${btn.icon} ${btn.text}` : btn.text,
                callback_data: btn.callback_data || 'noop'
            }]);
            payload.reply_markup = { inline_keyboard: inlineKeyboard };
        }

        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendVideo`, payload);
        return { success: true };
    } catch (error) {
        console.error('❌ فشل إرسال الفيديو:', error.message);
        return { success: false, error: error.message };
    }
}

// ============================================
// 🤖 أوامر البوت
// ============================================
async function handleCommand(chatId, text, firstName) {
    // التحقق من أن المستخدم هو المطور
    const isDev = chatId.toString() === CHAT_ID?.toString();

    // ==========================================
    // 1️⃣ أمر /start (لجميع المستخدمين)
    // ==========================================
    if (text === '/start') {
        const buttons = data.buttons;
        const welcomeText = `
🎉 **مرحباً بك في البوت!**

👤 الاسم: ${firstName}
🆔 المعرف: ${chatId}

📊 عدد الأزرار: ${buttons.length}
${isDev ? '\n🔐 أنت المطور، استخدم /admin لإدارة البوت.' : ''}
        `;

        // تسجيل المستخدم
        const existing = data.users.find(u => u.id === chatId);
        if (!existing) {
            data.users.push({
                id: chatId,
                first_name: firstName,
                joined_date: new Date().toISOString()
            });
        }

        await sendMessage(chatId, welcomeText, buttons);

        // إشعار للمطور بمستخدم جديد
        if (isDev && chatId.toString() !== CHAT_ID?.toString()) {
            await sendMessage(CHAT_ID, `👤 **مستخدم جديد!**\n🆔 ${chatId}\n📝 ${firstName}`);
        }

        return true;
    }

    // ==========================================
    // 2️⃣ أوامر المطور فقط
    // ==========================================
    if (!isDev) {
        await sendMessage(chatId, '⛔ هذا الأمر مخصص للمطور فقط.');
        return true;
    }

    // ==========================================
    // /admin - عرض لوحة المساعدة
    // ==========================================
    if (text === '/admin') {
        const helpText = `
🔐 **لوحة تحكم المطور**

📊 عدد الأزرار: ${data.buttons.length}
👥 عدد المستخدمين: ${data.users.length}
📌 عدد المثبتات: ${data.pins.length}
📨 رسائل مرسلة: ${data.stats.messages || 0}

📌 **الأوامر المتاحة:**

➖➖➖➖➖➖➖➖
**➕ إدارة الأزرار:**
\`/add|الاسم|الرابط|الصورة\`
\`/list\`
\`/remove ID\`
\`/edit|ID|الاسم|الرابط|الصورة\`

➖➖➖➖➖➖➖➖
**📢 الإعلانات:**
\`/broadcast|الرسالة\`
\`/pin|الرسالة\`
\`/pins\` - عرض المثبتات
\`/unpin ID\` - إلغاء تثبيت

➖➖➖➖➖➖➖➖
**👥 المستخدمين:**
\`/users\` - قائمة المستخدمين
\`/ban ID\` - حظر مستخدم
\`/unban ID\` - إلغاء حظر
\`/msg|ID|الرسالة\` - رسالة خاصة

➖➖➖➖➖➖➖➖
**📊 الإحصائيات:**
\`/stats\`
\`/reset\` - إعادة تعيين الإحصائيات

➖➖➖➖➖➖➖➖
**📌 أوامر سريعة:**
\`/admin\` - عرض هذه القائمة
        `;
        await sendMessage(chatId, helpText);
        return true;
    }

    // ==========================================
    // /add|الاسم|الرابط|الصورة - إضافة زر
    // ==========================================
    if (text.startsWith('/add')) {
        const parts = text.split('|');
        if (parts.length < 3) {
            await sendMessage(chatId, `❌ **صيغة خاطئة!**\n✅ \`/add|الاسم|الرابط|الصورة\``);
            return true;
        }

        const newButton = {
            id: `btn_${Date.now()}`,
            text: parts[1]?.trim() || 'زر جديد',
            url: parts[2]?.trim() || 'https://example.com',
            icon: parts[3]?.trim() || '🔗'
        };

        data.buttons.push(newButton);
        await sendMessage(chatId, `
✅ **تم إضافة الزر!**
📌 ${newButton.text}
🆔 \`${newButton.id}\`
📊 العدد: ${data.buttons.length}
        `);
        return true;
    }

    // ==========================================
    // /list - عرض الأزرار
    // ==========================================
    if (text === '/list') {
        if (data.buttons.length === 0) {
            await sendMessage(chatId, '📭 لا توجد أزرار.');
            return true;
        }

        let listText = '📋 **قائمة الأزرار:**\n\n';
        data.buttons.forEach((btn, i) => {
            listText += `${i+1}. *${btn.text}*\n🆔 \`${btn.id}\`\n🔗 ${btn.url}\n\n`;
        });
        await sendMessage(chatId, listText);
        return true;
    }

    // ==========================================
    // /remove ID - حذف زر
    // ==========================================
    if (text.startsWith('/remove')) {
        const id = text.split(' ')[1]?.trim();
        if (!id) {
            await sendMessage(chatId, `❌ **صيغة خاطئة!**\n✅ \`/remove ID\``);
            return true;
        }

        const filtered = data.buttons.filter(b => b.id !== id);
        if (filtered.length === data.buttons.length) {
            await sendMessage(chatId, `❌ الزر \`${id}\` غير موجود.`);
            return true;
        }

        data.buttons = filtered;
        await sendMessage(chatId, `✅ **تم حذف الزر!**\n🆔 \`${id}\``);
        return true;
    }

    // ==========================================
    // /edit|ID|الاسم|الرابط|الصورة - تعديل زر
    // ==========================================
    if (text.startsWith('/edit')) {
        const parts = text.split('|');
        if (parts.length < 4) {
            await sendMessage(chatId, `❌ **صيغة خاطئة!**\n✅ \`/edit|ID|الاسم|الرابط|الصورة\``);
            return true;
        }

        const id = parts[1]?.trim();
        const index = data.buttons.findIndex(b => b.id === id);
        if (index === -1) {
            await sendMessage(chatId, `❌ الزر \`${id}\` غير موجود.`);
            return true;
        }

        data.buttons[index].text = parts[2]?.trim() || data.buttons[index].text;
        data.buttons[index].url = parts[3]?.trim() || data.buttons[index].url;
        data.buttons[index].icon = parts[4]?.trim() || data.buttons[index].icon;

        await sendMessage(chatId, `✅ **تم تعديل الزر!**\n📌 ${data.buttons[index].text}`);
        return true;
    }

    // ==========================================
    // /broadcast|الرسالة - إرسال إعلان للجميع
    // ==========================================
    if (text.startsWith('/broadcast')) {
        const parts = text.split('|');
        if (parts.length < 2 || !parts[1]?.trim()) {
            await sendMessage(chatId, `❌ **صيغة خاطئة!**\n✅ \`/broadcast|الرسالة\``);
            return true;
        }

        const message = parts[1].trim();
        await sendMessage(chatId, `⏳ جاري إرسال الإعلان لـ ${data.users.length} مستخدم...`);

        let sent = 0;
        for (const user of data.users) {
            if (!user.banned) {
                const result = await sendMessage(user.id, `📢 **إعلان من المطور:**\n\n${message}`);
                if (result.success) sent++;
            }
        }

        data.stats.messages = (data.stats.messages || 0) + 1;
        await sendMessage(chatId, `
✅ **تم إرسال الإعلان!**
📨 تم الإرسال لـ: ${sent} مستخدم
👥 إجمالي المستخدمين: ${data.users.length}
        `);
        return true;
    }

    // ==========================================
    // /pin|الرسالة - تثبيت رسالة
    // ==========================================
    if (text.startsWith('/pin')) {
        const parts = text.split('|');
        if (parts.length < 2 || !parts[1]?.trim()) {
            await sendMessage(chatId, `❌ **صيغة خاطئة!**\n✅ \`/pin|الرسالة\``);
            return true;
        }

        const pin = {
            id: `pin_${Date.now()}`,
            message: parts[1].trim(),
            date: new Date().toISOString()
        };

        data.pins.unshift(pin);
        if (data.pins.length > 10) data.pins = data.pins.slice(0, 10);

        await sendMessage(chatId, `
📌 **تم تثبيت الرسالة!**
📝 ${pin.message}
🆔 \`${pin.id}\`
        `);
        return true;
    }

    // ==========================================
    // /pins - عرض المثبتات
    // ==========================================
    if (text === '/pins') {
        if (data.pins.length === 0) {
            await sendMessage(chatId, '📌 لا توجد رسائل مثبتة.');
            return true;
        }

        let pinsText = '📌 **الرسائل المثبتة:**\n\n';
        data.pins.forEach((pin, i) => {
            pinsText += `${i+1}. ${pin.message}\n🆔 \`${pin.id}\`\n📅 ${new Date(pin.date).toLocaleString()}\n\n`;
        });
        await sendMessage(chatId, pinsText);
        return true;
    }

    // ==========================================
    // /unpin ID - إلغاء تثبيت
    // ==========================================
    if (text.startsWith('/unpin')) {
        const id = text.split(' ')[1]?.trim();
        if (!id) {
            await sendMessage(chatId, `❌ **صيغة خاطئة!**\n✅ \`/unpin ID\``);
            return true;
        }

        const filtered = data.pins.filter(p => p.id !== id);
        if (filtered.length === data.pins.length) {
            await sendMessage(chatId, `❌ المثبت \`${id}\` غير موجود.`);
            return true;
        }

        data.pins = filtered;
        await sendMessage(chatId, `✅ **تم إلغاء التثبيت!**\n🆔 \`${id}\``);
        return true;
    }

    // ==========================================
    // /users - قائمة المستخدمين
    // ==========================================
    if (text === '/users') {
        if (data.users.length === 0) {
            await sendMessage(chatId, '👥 لا يوجد مستخدمون.');
            return true;
        }

        let usersText = '👥 **قائمة المستخدمين:**\n\n';
        data.users.forEach((user, i) => {
            usersText += `${i+1}. ${user.first_name || 'مستخدم'}\n🆔 \`${user.id}\`\n📅 ${new Date(user.joined_date).toLocaleString()}\n${user.banned ? '⛔ محظور' : '🟢 نشط'}\n\n`;
        });
        await sendMessage(chatId, usersText);
        return true;
    }

    // ==========================================
    // /ban ID - حظر مستخدم
    // ==========================================
    if (text.startsWith('/ban')) {
        const id = text.split(' ')[1]?.trim();
        if (!id) {
            await sendMessage(chatId, `❌ **صيغة خاطئة!**\n✅ \`/ban ID\``);
            return true;
        }

        const user = data.users.find(u => u.id == id);
        if (!user) {
            await sendMessage(chatId, `❌ المستخدم \`${id}\` غير موجود.`);
            return true;
        }

        user.banned = true;
        await sendMessage(chatId, `⛔ **تم حظر المستخدم!**\n👤 ${user.first_name}\n🆔 \`${id}\``);
        await sendMessage(id, '⛔ تم حظرك من استخدام هذا البوت.');
        return true;
    }

    // ==========================================
    // /unban ID - إلغاء حظر مستخدم
    // ==========================================
    if (text.startsWith('/unban')) {
        const id = text.split(' ')[1]?.trim();
        if (!id) {
            await sendMessage(chatId, `❌ **صيغة خاطئة!**\n✅ \`/unban ID\``);
            return true;
        }

        const user = data.users.find(u => u.id == id);
        if (!user) {
            await sendMessage(chatId, `❌ المستخدم \`${id}\` غير موجود.`);
            return true;
        }

        user.banned = false;
        await sendMessage(chatId, `✅ **تم إلغاء حظر المستخدم!**\n👤 ${user.first_name}\n🆔 \`${id}\``);
        await sendMessage(id, '✅ تم إلغاء حظرك، يمكنك استخدام البوت مجدداً.');
        return true;
    }

    // ==========================================
    // /msg|ID|الرسالة - رسالة خاصة
    // ==========================================
    if (text.startsWith('/msg')) {
        const parts = text.split('|');
        if (parts.length < 3 || !parts[2]?.trim()) {
            await sendMessage(chatId, `❌ **صيغة خاطئة!**\n✅ \`/msg|ID|الرسالة\``);
            return true;
        }

        const userId = parts[1]?.trim();
        const message = parts[2].trim();

        const result = await sendMessage(userId, `📨 **رسالة من المطور:**\n\n${message}`);
        if (result.success) {
            await sendMessage(chatId, `✅ **تم إرسال الرسالة!**\n🆔 \`${userId}\``);
        } else {
            await sendMessage(chatId, `❌ فشل إرسال الرسالة للمستخدم \`${userId}\``);
        }
        return true;
    }

    // ==========================================
    // /stats - الإحصائيات
    // ==========================================
    if (text === '/stats') {
        const statsText = `
📊 **إحصائيات البوت:**

👥 المستخدمين: ${data.users.length}
🟢 نشطون: ${data.users.filter(u => !u.banned).length}
⛔ محظورون: ${data.users.filter(u => u.banned).length}

📊 الأزرار: ${data.buttons.length}
📌 المثبتات: ${data.pins.length}
📨 رسائل مرسلة: ${data.stats.messages || 0}

📅 آخر تحديث: ${new Date().toLocaleString()}
        `;
        await sendMessage(chatId, statsText);
        return true;
    }

    // ==========================================
    // /reset - إعادة تعيين الإحصائيات
    // ==========================================
    if (text === '/reset') {
        data.stats.messages = 0;
        await sendMessage(chatId, '✅ **تم إعادة تعيين الإحصائيات!**');
        return true;
    }

    // ==========================================
    // أوامر غير معروفة
    // ==========================================
    await sendMessage(chatId, `❌ أمر غير معروف.\n📌 استخدم /admin لعرض الأوامر المتاحة.`);
    return true;
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
    // 🤖 Webhook من تليجرام
    // ============================================
    if (req.method === 'POST') {
        try {
            const update = req.body;

            // معالجة Callback Query (الضغط على الأزرار)
            if (update.callback_query) {
                try {
                    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
                        callback_query_id: update.callback_query.id,
                        text: '⚠️ هذا زر إشعار فقط!',
                        show_alert: false
                    });
                } catch (error) {
                    console.error('❌ فشل الرد على الضغط:', error.message);
                }
                return res.status(200).json({ ok: true });
            }

            // معالجة الرسائل
            if (update.message) {
                const message = update.message;
                const chatId = message.chat.id;
                const text = message.text || '';
                const firstName = message.from?.first_name || 'مستخدم';

                console.log(`💬 رسالة من ${chatId}: "${text}"`);

                // معالجة الأمر
                await handleCommand(chatId, text, firstName);
            }

            return res.status(200).json({ ok: true });
        } catch (error) {
            console.error('❌ خطأ:', error.message);
            return res.status(200).json({ ok: false });
        }
    }

    // ============================================
    // 🏠 GET - اختبار
    // ============================================
    if (req.method === 'GET') {
        return res.status(200).json({
            status: '✅ البوت يعمل!',
            webhook: '/api/webhook',
            buttons: data.buttons.length,
            users: data.users.length,
            time: new Date().toISOString()
        });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
};
