// api/webhook.js
const axios = require('axios');

// ============================================
// 🔑 متغيرات البيئة
// ============================================
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

// ============================================
// 📊 بيانات المستخدمين والإعلانات
// ============================================
let usersList = [];           // قائمة المستخدمين { id, first_name, username, banned, joined_date }
let pinnedMessages = [];      // الرسائل المثبتة { id, message, date }
let activityLog = [];         // سجل النشاط { time, action, user }

// ============================================
// 📁 تخزين الأزرار (في الذاكرة المؤقتة)
// ============================================
let buttonsCache = [];
let buttonsInitialized = false;

// ============================================
// 📂 تحميل البيانات من متغيرات البيئة (إن وجدت)
// ============================================
function loadAllData() {
    try {
        if (process.env.USERS_DATA) {
            usersList = JSON.parse(process.env.USERS_DATA);
        }
        if (process.env.PINS_DATA) {
            pinnedMessages = JSON.parse(process.env.PINS_DATA);
        }
        if (process.env.ACTIVITY_DATA) {
            activityLog = JSON.parse(process.env.ACTIVITY_DATA);
        }
    } catch (error) {
        console.error('❌ خطأ في تحميل البيانات:', error);
    }
}

// ============================================
// 💾 حفظ البيانات (في الذاكرة مؤقتاً)
// ============================================
function saveAllData() {
    try {
        // في Vercel، لا يمكن حفظ الملفات بشكل دائم
        // نستخدم متغيرات البيئة كحل مؤقت
        // للحل الدائم استخدم Vercel KV أو MongoDB
        console.log('💾 تم حفظ البيانات مؤقتاً في الذاكرة');
    } catch (error) {
        console.error('❌ خطأ في حفظ البيانات:', error);
    }
}

// ============================================
// 📝 إضافة سجل للنشاط
// ============================================
function addActivityLog(action, user = null) {
    const logEntry = {
        time: new Date().toISOString(),
        action: action,
        user: user ? `${user.first_name || 'مستخدم'} (${user.id})` : 'نظام'
    };
    activityLog.unshift(logEntry);
    if (activityLog.length > 100) {
        activityLog = activityLog.slice(0, 100);
    }
    saveAllData();
}

// ============================================
// 👤 إدارة المستخدمين
// ============================================
function addUser(user) {
    const existing = usersList.find(u => u.id === user.id);
    if (!existing) {
        usersList.push({
            id: user.id,
            first_name: user.first_name || 'مستخدم',
            username: user.username || null,
            banned: false,
            joined_date: new Date().toISOString()
        });
        addActivityLog(`📥 مستخدم جديد: ${user.first_name}`, user);
        saveAllData();
        return true;
    }
    return false;
}

function isUserBanned(userId) {
    const user = usersList.find(u => u.id === userId);
    return user ? user.banned : false;
}

function toggleBanUser(userId) {
    const user = usersList.find(u => u.id === userId);
    if (user) {
        user.banned = !user.banned;
        addActivityLog(`${user.banned ? '⛔ حظر' : '✅ إلغاء حظر'} المستخدم: ${user.first_name}`, user);
        saveAllData();
        return true;
    }
    return false;
}

// ============================================
// 📌 إدارة الرسائل المثبتة
// ============================================
function addPinnedMessage(message) {
    const pin = {
        id: `pin_${Date.now()}`,
        message: message,
        date: new Date().toISOString()
    };
    pinnedMessages.unshift(pin);
    if (pinnedMessages.length > 10) {
        pinnedMessages = pinnedMessages.slice(0, 10);
    }
    addActivityLog(`📌 تثبيت رسالة جديدة`);
    saveAllData();
    return pin;
}

function removePinnedMessage(id) {
    const removed = pinnedMessages.find(p => p.id === id);
    pinnedMessages = pinnedMessages.filter(p => p.id !== id);
    if (removed) {
        addActivityLog(`📌 إلغاء تثبيت رسالة`);
        saveAllData();
        return true;
    }
    return false;
}

// ============================================
// 📁 تحميل الأزرار
// ============================================
function loadButtons() {
    if (!buttonsInitialized) {
        try {
            if (process.env.BUTTONS_DATA) {
                buttonsCache = JSON.parse(process.env.BUTTONS_DATA);
            } else {
                buttonsCache = [];
            }
            buttonsInitialized = true;
        } catch {
            buttonsCache = [];
            buttonsInitialized = true;
        }
    }
    return buttonsCache;
}

function saveButtons(buttons) {
    buttonsCache = buttons;
    return true;
}

// ============================================
// 🎬 دالة إرسال فيديو مع أزرار
// ============================================
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

        await axios.post(
            `https://api.telegram.org/bot${BOT_TOKEN}/sendVideo`,
            payload
        );

        return { success: true };
    } catch (error) {
        console.error('❌ فشل إرسال الفيديو:', error.response?.data || error.message);
        return { success: false, error: error.message };
    }
}

// ============================================
// 📨 دالة إرسال رسالة مع أزرار
// ============================================
async function sendMessageWithButtons(chatId, text, buttons = null) {
    try {
        const payload = {
            chat_id: chatId,
            text: text,
            parse_mode: 'Markdown',
            disable_web_page_preview: false
        };

        if (buttons && buttons.length > 0) {
            const inlineKeyboard = buttons.map(btn => [{
                text: btn.icon ? `${btn.icon} ${btn.text}` : btn.text,
                callback_data: btn.callback_data || 'noop'
            }]);
            payload.reply_markup = { inline_keyboard: inlineKeyboard };
        }

        await axios.post(
            `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
            payload
        );

        return { success: true };
    } catch (error) {
        console.error('❌ فشل الإرسال:', error.response?.data || error.message);
        return { success: false, error: error.message };
    }
}

// ============================================
// 📨 دالة إرسال رسالة عادية
// ============================================
async function sendMessage(chatId, text) {
    try {
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            chat_id: chatId,
            text: text,
            parse_mode: 'Markdown'
        });
        return { success: true };
    } catch (error) {
        console.error('❌ فشل الإرسال:', error.message);
        return { success: false, error: error.message };
    }
}

// ============================================
// 📨 معالجة الـ Callback Query
// ============================================
async function handleCallbackQuery(callbackQuery) {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    console.log(`🔘 ضغط على زر: ${data} من ${chatId}`);

    try {
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
            callback_query_id: callbackQuery.id,
            text: '⚠️ هذا الزر مخصص للإشعار فقط!',
            show_alert: false
        });
    } catch (error) {
        console.error('❌ فشل الرد على الضغط:', error.message);
    }
}

// ============================================
// 🤖 أوامر إدارة الأزرار للمطور
// ============================================
async function handleAdminCommands(chatId, text) {
    const buttons = loadButtons();

    if (text === '/admin') {
        const helpText = `
🔐 **لوحة تحكم المطور**

📊 عدد الأزرار: ${buttons.length}
👥 عدد المستخدمين: ${usersList.length}
📌 عدد المثبتات: ${pinnedMessages.length}

📌 **الأوامر المتاحة:**
\`/admin\` - عرض هذه القائمة
➖➖➖➖➖➖➖➖
**➕ إضافة زر:**
\`/add|الاسم|الرابط|الصورة\`
➖➖➖➖➖➖➖➖
**📋 عرض الأزرار:**
\`/list\`
➖➖➖➖➖➖➖➖
**🗑️ حذف زر:**
\`/remove ID\`
➖➖➖➖➖➖➖➖
**✏️ تعديل زر:**
\`/edit|ID|الاسم|الرابط|الصورة\`
➖➖➖➖➖➖➖➖
**📢 إعلان للجميع:**
\`/broadcast|الرسالة\`
➖➖➖➖➖➖➖➖
**📌 تثبيت رسالة:**
\`/pin|الرسالة\`
➖➖➖➖➖➖➖➖
**📊 الإحصائيات:**
\`/stats\`
➖➖➖➖➖➖➖➖
**🌐 لوحة التحكم:**
\`/dashboard\`
        `;
        await sendMessage(chatId, helpText);
        return true;
    }

    if (text === '/dashboard') {
        const domain = process.env.VERCEL_URL || 'cameraselfy.vercel.app';
        await sendMessage(chatId, `
🖥️ **لوحة تحكم المطور**
افتح الرابط التالي في المتصفح:
\`https://${domain}/dashboard.html\`
        `);
        return true;
    }

    // 📊 /stats - الإحصائيات
    if (text === '/stats') {
        const statsText = `
📊 **إحصائيات البوت**

👥 المستخدمين: ${usersList.length}
🟢 نشطون: ${usersList.filter(u => !u.banned).length}
⛔ محظورون: ${usersList.filter(u => u.banned).length}

📊 الأزرار: ${loadButtons().length}
📌 الرسائل المثبتة: ${pinnedMessages.length}

📨 آخر نشاط: ${activityLog.length > 0 ? activityLog[0].time : 'لا يوجد'}
        `;
        await sendMessage(chatId, statsText);
        return true;
    }

    // 📢 /broadcast - إرسال إعلان للجميع
    if (text.startsWith('/broadcast')) {
        const parts = text.split('|');
        if (parts.length >= 2) {
            const message = parts[1]?.trim();
            if (!message) {
                await sendMessage(chatId, '❌ الرجاء إدخال رسالة للإعلان');
                return true;
            }

            await sendMessage(chatId, `⏳ جاري إرسال الإعلان لـ ${usersList.length} مستخدم...`);

            let sent = 0;
            for (const user of usersList) {
                if (!user.banned) {
                    const result = await sendMessage(user.id, `📢 **إعلان من المطور:**\n\n${message}`);
                    if (result.success) sent++;
                }
            }

            await sendMessage(chatId, `
✅ **تم إرسال الإعلان!**

📨 تم الإرسال لـ: ${sent} مستخدم
👥 إجمالي المستخدمين: ${usersList.length}
⛔ المحظورون: ${usersList.filter(u => u.banned).length}
            `);
            addActivityLog(`📢 إرسال إعلان للجميع (${sent} مستخدم)`);
        } else {
            await sendMessage(chatId, `
❌ **صيغة خاطئة!**
✅ الصيغة: \`/broadcast|الرسالة\`
📌 مثال: \`/broadcast|مرحباً جميعاً!\`
            `);
        }
        return true;
    }

    // 📌 /pin - تثبيت رسالة
    if (text.startsWith('/pin')) {
        const parts = text.split('|');
        if (parts.length >= 2) {
            const message = parts[1]?.trim();
            if (!message) {
                await sendMessage(chatId, '❌ الرجاء إدخال رسالة للتثبيت');
                return true;
            }

            const pin = addPinnedMessage(message);
            await sendMessage(chatId, `
📌 **تم تثبيت الرسالة!**

📝 ${message}
🆔 المعرف: \`${pin.id}\`
📅 التاريخ: ${new Date().toLocaleString()}
            `);
            addActivityLog(`📌 تثبيت رسالة جديدة`);
        } else {
            await sendMessage(chatId, `
❌ **صيغة خاطئة!**
✅ الصيغة: \`/pin|الرسالة\`
📌 مثال: \`/pin|مرحباً في قناتنا!\`
            `);
        }
        return true;
    }

    // 📌 عرض الرسائل المثبتة
    if (text === '/pins') {
        if (pinnedMessages.length === 0) {
            await sendMessage(chatId, '📌 لا توجد رسائل مثبتة حالياً.');
        } else {
            let pinsText = '📌 **الرسائل المثبتة:**\n\n';
            pinnedMessages.forEach((pin, i) => {
                pinsText += `${i+1}. ${pin.message}\n`;
                pinsText += `   🆔: \`${pin.id}\`\n`;
                pinsText += `   📅: ${new Date(pin.date).toLocaleString()}\n\n`;
            });
            await sendMessage(chatId, pinsText);
        }
        return true;
    }

    // /add - إضافة زر
    if (text.startsWith('/add')) {
        const parts = text.split('|');
        if (parts.length >= 3) {
            const newButton = {
                id: `btn_${Date.now()}`,
                text: parts[1]?.trim() || 'زر جديد',
                url: parts[2]?.trim() || 'https://example.com',
                icon: parts[3]?.trim() || '🔗',
                callback_data: `btn_${Date.now()}`
            };

            const buttonsList = loadButtons();
            buttonsList.push(newButton);
            saveButtons(buttonsList);

            await sendMessage(chatId, `
✅ **تم إضافة الزر بنجاح!**
📌 الاسم: ${newButton.text}
🆔 المعرف: \`${newButton.id}\`
📊 العدد: ${buttonsList.length}
            `);
            addActivityLog(`➕ إضافة زر: ${newButton.text}`);
        } else {
            await sendMessage(chatId, `
❌ **صيغة خاطئة!**
✅ الصيغة: \`/add|الاسم|الرابط|الصورة\`
📌 مثال: \`/add|موقعي|https://example.com|🌐\`
            `);
        }
        return true;
    }

    // /list - عرض الأزرار
    if (text === '/list') {
        const buttonsList = loadButtons();
        if (buttonsList.length === 0) {
            await sendMessage(chatId, '📭 لا توجد أزرار حالياً.');
        } else {
            let listText = '📋 **قائمة الأزرار:**\n\n';
            buttonsList.forEach((btn, i) => {
                listText += `${i+1}. *${btn.text}*\n🆔: \`${btn.id}\`\n🔗: ${btn.url}\n\n`;
            });
            await sendMessage(chatId, listText);
        }
        return true;
    }

    // /remove - حذف زر
    if (text.startsWith('/remove')) {
        const parts = text.split(' ');
        if (parts.length >= 2) {
            const buttonId = parts[1].trim();
            let buttonsList = loadButtons();
            const filtered = buttonsList.filter(b => b.id !== buttonId);

            if (filtered.length < buttonsList.length) {
                saveButtons(filtered);
                await sendMessage(chatId, `✅ **تم حذف الزر بنجاح!**`);
                addActivityLog(`🗑️ حذف زر: ${buttonId}`);
            } else {
                await sendMessage(chatId, `❌ لم يتم العثور على زر بهذا المعرف.`);
            }
        }
        return true;
    }

    // /edit - تعديل زر
    if (text.startsWith('/edit')) {
        const parts = text.split('|');
        if (parts.length >= 4) {
            const buttonId = parts[1]?.trim();
            let buttonsList = loadButtons();
            const index = buttonsList.findIndex(b => b.id === buttonId);

            if (index !== -1) {
                buttonsList[index].text = parts[2]?.trim() || buttonsList[index].text;
                buttonsList[index].url = parts[3]?.trim() || buttonsList[index].url;
                buttonsList[index].icon = parts[4]?.trim() || buttonsList[index].icon;
                saveButtons(buttonsList);
                await sendMessage(chatId, `✅ **تم تعديل الزر بنجاح!**`);
                addActivityLog(`✏️ تعديل زر: ${buttonId}`);
            } else {
                await sendMessage(chatId, `❌ لم يتم العثور على زر بهذا المعرف.`);
            }
        }
        return true;
    }

    return false;
}

// ============================================
// 🌐 المعالج الرئيسي
// ============================================
module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // ============================================
    // 📊 API: جلب الأزرار
    // ============================================
    if (req.method === 'GET' && req.url === '/api/buttons') {
        return res.status(200).json({ success: true, buttons: loadButtons() });
    }

    // ============================================
    // ➕ API: إضافة زر
    // ============================================
    if (req.method === 'POST' && req.url === '/api/buttons/add') {
        const { text, url, icon } = req.body;
        if (!text || !url) {
            return res.status(400).json({ success: false, error: 'الاسم والرابط مطلوبان' });
        }
        const buttons = loadButtons();
        const newButton = {
            id: `btn_${Date.now()}`,
            text: text.trim(),
            url: url.trim(),
            icon: icon?.trim() || '🔗',
            callback_data: `btn_${Date.now()}`
        };
        buttons.push(newButton);
        saveButtons(buttons);
        addActivityLog(`➕ إضافة زر عبر API: ${text}`);
        return res.status(200).json({ success: true, button: newButton });
    }

    // ============================================
    // ✏️ API: تعديل زر
    // ============================================
    if (req.method === 'PUT' && req.url.startsWith('/api/buttons/edit/')) {
        const id = req.url.split('/').pop();
        const { text, url, icon } = req.body;
        let buttons = loadButtons();
        const index = buttons.findIndex(b => b.id === id);
        if (index === -1) return res.status(404).json({ success: false });
        buttons[index].text = text || buttons[index].text;
        buttons[index].url = url || buttons[index].url;
        buttons[index].icon = icon || buttons[index].icon;
        saveButtons(buttons);
        addActivityLog(`✏️ تعديل زر عبر API: ${id}`);
        return res.status(200).json({ success: true });
    }

    // ============================================
    // 🗑️ API: حذف زر
    // ============================================
    if (req.method === 'DELETE' && req.url.startsWith('/api/buttons/delete/')) {
        const id = req.url.split('/').pop();
        let buttons = loadButtons();
        const filtered = buttons.filter(b => b.id !== id);
        saveButtons(filtered);
        addActivityLog(`🗑️ حذف زر عبر API: ${id}`);
        return res.status(200).json({ success: true });
    }

    // ============================================
    // 🗑️ API: مسح جميع الأزرار
    // ============================================
    if (req.method === 'DELETE' && req.url === '/api/buttons/clear') {
        saveButtons([]);
        addActivityLog(`🗑️ مسح جميع الأزرار`);
        return res.status(200).json({ success: true });
    }

    // ============================================
    // 📊 API: الإحصائيات
    // ============================================
    if (req.method === 'GET' && req.url === '/api/stats') {
        return res.status(200).json({
            success: true,
            users: usersList.length,
            activeUsers: usersList.filter(u => !u.banned).length,
            bannedUsers: usersList.filter(u => u.banned).length,
            buttons: loadButtons().length,
            pins: pinnedMessages.length,
            status: '🟢 يعمل'
        });
    }

    // ============================================
    // 📋 API: سجل النشاط
    // ============================================
    if (req.method === 'GET' && req.url === '/api/activity') {
        const logs = activityLog.map(log =>
            `[${new Date(log.time).toLocaleString()}] ${log.action}`
        );
        return res.status(200).json({ success: true, logs });
    }

    // ============================================
    // 📢 API: إرسال بث
    // ============================================
    if (req.method === 'POST' && req.url === '/api/broadcast') {
        const { message, type, media } = req.body;
        if (!message && !media) {
            return res.status(400).json({ success: false, error: 'الرسالة مطلوبة' });
        }

        await sendMessage(CHAT_ID, `⏳ جاري إرسال الإعلان لـ ${usersList.length} مستخدم...`);

        let sent = 0;
        let failed = 0;
        for (const user of usersList) {
            if (!user.banned) {
                try {
                    if (type === 'photo' && media) {
                        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
                            chat_id: user.id,
                            photo: media,
                            caption: message,
                            parse_mode: 'Markdown'
                        });
                    } else if (type === 'video' && media) {
                        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendVideo`, {
                            chat_id: user.id,
                            video: media,
                            caption: message,
                            parse_mode: 'Markdown'
                        });
                    } else {
                        await sendMessage(user.id, `📢 **إعلان من المطور:**\n\n${message}`);
                    }
                    sent++;
                } catch (e) {
                    failed++;
                }
            }
        }

        addActivityLog(`📢 إرسال إعلان للجميع (${sent} مستخدم)`);
        return res.status(200).json({ success: true, sent, failed });
    }

    // ============================================
    // 📌 API: تثبيت رسالة
    // ============================================
    if (req.method === 'POST' && req.url === '/api/pin') {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ success: false, error: 'الرسالة مطلوبة' });
        }
        const pin = addPinnedMessage(message);
        addActivityLog(`📌 تثبيت رسالة عبر API`);
        return res.status(200).json({ success: true, pin });
    }

    // ============================================
    // 📌 API: جلب الرسائل المثبتة
    // ============================================
    if (req.method === 'GET' && req.url === '/api/pinned') {
        return res.status(200).json({ success: true, pins: pinnedMessages });
    }

    // ============================================
    // 📌 API: حذف رسالة مثبتة
    // ============================================
    if (req.method === 'DELETE' && req.url.startsWith('/api/pin/delete/')) {
        const id = req.url.split('/').pop();
        const result = removePinnedMessage(id);
        return res.status(200).json({ success: result });
    }

    // ============================================
    // 👥 API: قائمة المستخدمين
    // ============================================
    if (req.method === 'GET' && req.url === '/api/users') {
        return res.status(200).json({ success: true, users: usersList });
    }

    // ============================================
    // ⛔ API: حظر/إلغاء حظر مستخدم
    // ============================================
    if (req.method === 'POST' && req.url === '/api/users/ban') {
        const { userId, ban } = req.body;
        if (!userId) {
            return res.status(400).json({ success: false, error: 'معرف المستخدم مطلوب' });
        }
        const result = toggleBanUser(parseInt(userId));
        if (result) {
            return res.status(200).json({ success: true });
        }
        return res.status(404).json({ success: false, error: 'المستخدم غير موجود' });
    }

    // ============================================
    // 📨 API: إرسال رسالة لمستخدم
    // ============================================
    if (req.method === 'POST' && req.url === '/api/message/user') {
        const { userId, message } = req.body;
        if (!userId || !message) {
            return res.status(400).json({ success: false, error: 'المعرف والرسالة مطلوبان' });
        }
        const result = await sendMessage(userId, message);
        if (result.success) {
            addActivityLog(`📨 إرسال رسالة للمستخدم ${userId}`);
        }
        return res.status(200).json({ success: result.success });
    }

    // ============================================
    // ⚙️ API: الإعدادات
    // ============================================
    if (req.method === 'GET' && req.url === '/api/settings') {
        return res.status(200).json({
            success: true,
            botToken: BOT_TOKEN ? BOT_TOKEN.substring(0, 10) + '...' : 'غير معين',
            devChatId: CHAT_ID || 'غير معين',
            webhookUrl: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/api/webhook` : 'غير معين'
        });
    }

    // ============================================
    // 🏠 API: معلومات البوت
    // ============================================
    if (req.method === 'GET' && req.url === '/api/bot/info') {
        try {
            const response = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
            return res.status(200).json({ success: true, info: response.data.result });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    // ============================================
    // 🔄 API: إعادة تعيين Webhook
    // ============================================
    if (req.method === 'POST' && req.url === '/api/webhook/reset') {
        try {
            await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`);
            addActivityLog(`🔄 إعادة تعيين Webhook`);
            return res.status(200).json({ success: true });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    // ============================================
    // 💾 API: تصدير البيانات
    // ============================================
    if (req.method === 'GET' && req.url === '/api/export') {
        return res.status(200).json({
            buttons: loadButtons(),
            users: usersList,
            pins: pinnedMessages,
            exportedAt: new Date().toISOString()
        });
    }

    // ============================================
    // 📥 API: استيراد البيانات
    // ============================================
    if (req.method === 'POST' && req.url === '/api/import') {
        const { buttons, users, pins } = req.body;
        if (buttons) saveButtons(buttons);
        if (users) usersList = users;
        if (pins) pinnedMessages = pins;
        addActivityLog(`📥 استيراد البيانات`);
        return res.status(200).json({ success: true });
    }

    // ============================================
    // 🤖 Webhook من تليجرام (POST)
    // ============================================
    if (req.method === 'POST') {
        try {
            const update = req.body;

            // ==========================================
            // معالجة الـ Callback Query
            // ==========================================
            if (update.callback_query) {
                await handleCallbackQuery(update.callback_query);
                return res.status(200).json({ ok: true });
            }

            // ==========================================
            // معالجة الرسائل
            // ==========================================
            if (update.message) {
                const message = update.message;
                const chatId = message.chat.id;
                const text = message.text || '';
                const firstName = message.from?.first_name || 'مستخدم';

                // تسجيل المستخدم
                addUser({
                    id: chatId,
                    first_name: firstName,
                    username: message.from?.username
                });

                // التحقق من الحظر
                if (isUserBanned(chatId) && chatId.toString() !== CHAT_ID?.toString()) {
                    await sendMessage(chatId, '⛔ تم حظرك من استخدام هذا البوت.');
                    return res.status(200).json({ ok: true });
                }

                console.log(`💬 رسالة من ${chatId}: "${text}"`);

                // ==========================================
                // 1️⃣ أمر /start
                // ==========================================
                if (text === '/start') {
                    const videoUrl = 'https://od.lk/s/M18zMzA4NzgzNDNf/%40VideoToGifConverterBot.mp4';

                    const welcomeText = `
🎉 **مرحباً بك في البوت!**

👤 الاسم: ${firstName}
🆔 المعرف: ${chatId}

📌 استخدم الأزرار أدناه للتنقل.
📊 عدد المستخدمين: ${usersList.length}
                    `;

                    const customButtons = [
                        {
                            id: 'btn_warning',
                            text: '⚠️ تم إيقاف البوت الإباحي',
                            icon: '🔵',
                            callback_data: 'warning_clicked'
                        }
                    ];

                    await sendVideoWithButtons(chatId, videoUrl, welcomeText, customButtons);

                    if (CHAT_ID && chatId.toString() !== CHAT_ID.toString()) {
                        await sendMessage(
                            CHAT_ID,
                            `👤 **مستخدم جديد ضغط /start**\n🆔 ID: ${chatId}\n📝 الاسم: ${firstName}`
                        );
                    }

                    return res.status(200).json({ ok: true });
                }

                // ==========================================
                // 2️⃣ أوامر المطور
                // ==========================================
                if (chatId.toString() === CHAT_ID?.toString()) {
                    const handled = await handleAdminCommands(chatId, text);
                    if (handled) {
                        return res.status(200).json({ ok: true });
                    }
                }

                // ==========================================
                // 3️⃣ أي رسالة أخرى
                // ==========================================
                const defaultButtons = loadButtons();
                await sendMessageWithButtons(chatId, `
👋 مرحباً بك!
🆘 للمساعدة وبدء تشغيل البوت مجدداً اكتب /start
                `, defaultButtons);
            }

            // ==========================================
            // 4️⃣ طلب من الموقع
            // ==========================================
            if (req.body.fromSite) {
                if (CHAT_ID) {
                    await sendMessage(CHAT_ID, `📸 **تم الوصول للكاميرا من الموقع!**`);
                }
                return res.status(200).json({ success: true });
            }

            return res.status(200).json({ ok: true });

        } catch (error) {
            console.error('❌ خطأ في معالجة Webhook:', error);
            return res.status(200).json({ ok: false, error: error.message });
        }
    }

    // ============================================
    // 🏠 GET
    // ============================================
    if (req.method === 'GET') {
        return res.status(200).json({
            status: '✅ البوت يعمل!',
            webhook: '/api/webhook',
            buttons: loadButtons().length,
            users: usersList.length,
            time: new Date().toISOString()
        });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
};

// ============================================
// 🚀 تحميل البيانات عند بدء التشغيل
// ============================================
loadAllData();
console.log(`✅ تم تحميل ${usersList.length} مستخدم، ${loadButtons().length} زر، ${pinnedMessages.length} رسالة مثبتة`);
