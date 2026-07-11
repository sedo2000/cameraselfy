// api/webhook.js
const axios = require('axios');

// ============================================
// 🔑 متغيرات البيئة
// ============================================
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

// ============================================
// 📁 تخزين الأزرار (في الذاكرة المؤقتة)
// ⚠️ في Vercel، يتم إعادة تحميل الوظيفة لكل طلب،
// لذا سنستخدم متغيرًا عامًا للحفاظ على البيانات مؤقتًا.
// للحل الدائم، استخدم Vercel KV أو MongoDB.
// ============================================
let buttonsCache = [];
let buttonsInitialized = false;

// تحميل الأزرار من متغير البيئة (إن وجد)
function loadButtons() {
    if (!buttonsInitialized) {
        try {
            if (process.env.BUTTONS_DATA) {
                buttonsCache = JSON.parse(process.env.BUTTONS_DATA);
            } else {
                // أزرار افتراضية
                buttonsCache = [
                    {
                        id: 'btn_default_1',
                        text: '🌐 موقعي',
                        url: 'https://example.com',
                        icon: '🌐'
                    },
                    {
                        id: 'btn_default_2',
                        text: '📸 انستغرام',
                        url: 'https://instagram.com',
                        icon: '📸'
                    }
                ];
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
// 🎬 دالة إرسال فيديو مع أزرار (الجديدة)
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
                url: btn.url
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
                url: btn.url
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
// 🤖 أوامر إدارة الأزرار للمطور
// ============================================
async function handleAdminCommands(chatId, text) {
    const buttons = loadButtons();

    if (text === '/admin') {
        const helpText = `
🔐 **لوحة تحكم المطور**

📊 عدد الأزرار: ${buttons.length}

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

    if (text.startsWith('/add')) {
        const parts = text.split('|');
        if (parts.length >= 3) {
            const newButton = {
                id: `btn_${Date.now()}`,
                text: parts[1]?.trim() || 'زر جديد',
                url: parts[2]?.trim() || 'https://example.com',
                icon: parts[3]?.trim() || '🔗'
            };

            const buttonsList = loadButtons();
            buttonsList.push(newButton);
            saveButtons(buttonsList);

            await sendMessage(chatId, `✅ **تم إضافة الزر بنجاح!**\n🆔 المعرف: \`${newButton.id}\``);
        } else {
            await sendMessage(chatId, `❌ **صيغة خاطئة!** \n\`/add|الاسم|الرابط|الصورة\``);
        }
        return true;
    }

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

    if (text.startsWith('/remove')) {
        const parts = text.split(' ');
        if (parts.length >= 2) {
            const buttonId = parts[1].trim();
            let buttonsList = loadButtons();
            const filtered = buttonsList.filter(b => b.id !== buttonId);

            if (filtered.length < buttonsList.length) {
                saveButtons(filtered);
                await sendMessage(chatId, `✅ **تم حذف الزر بنجاح!**`);
            } else {
                await sendMessage(chatId, `❌ لم يتم العثور على زر بهذا المعرف.`);
            }
        }
        return true;
    }

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

    // [APIs لـ لوحة التحكم تم الإبقاء عليها كما هي لقصر المساحة وبنفس منطق الكود القديم]
    if (req.method === 'GET' && req.url === '/api/buttons') {
        return res.status(200).json({ success: true, buttons: loadButtons() });
    }
    if (req.method === 'POST' && req.url === '/api/buttons/add') {
        const { text, url, icon } = req.body;
        const buttons = loadButtons();
        const newButton = { id: `btn_${Date.now()}`, text: text.trim(), url: url.trim(), icon: icon?.trim() || '🔗' };
        buttons.push(newButton); saveButtons(buttons);
        return res.status(200).json({ success: true, button: newButton });
    }
    if (req.method === 'PUT' && req.url.startsWith('/api/buttons/edit/')) {
        const id = req.url.split('/').pop(); const { text, url, icon } = req.body;
        let buttons = loadButtons(); const index = buttons.findIndex(b => b.id === id);
        if (index === -1) return res.status(404).json({ success: false });
        buttons[index].text = text || buttons[index].text; buttons[index].url = url || buttons[index].url; buttons[index].icon = icon || buttons[index].icon;
        saveButtons(buttons); return res.status(200).json({ success: true });
    }
    if (req.method === 'DELETE' && req.url.startsWith('/api/buttons/delete/')) {
        const id = req.url.split('/').pop(); let buttons = loadButtons(); const filtered = buttons.filter(b => b.id !== id);
        saveButtons(filtered); return res.status(200).json({ success: true });
    }

    // ============================================
    // 🤖 Webhook من تليجرام (POST)
    // ============================================
    if (req.method === 'POST') {
        try {
            const update = req.body;

            if (update.message) {
                const message = update.message;
                const chatId = message.chat.id;
                const text = message.text || '';
                const firstName = message.from?.first_name || 'مستخدم';

                // ==========================================
                // 1️⃣ أمر /start (التعديل المطلوب هنا 📌)
                // ==========================================
                if (text === '/start') {
                    const videoUrl = 'https://od.lk/s/M18zMzA4NzgzNDNf/%40VideoToGifConverterBot.mp4';
                    
                    // تحضير نص كابشن الفيديو الترحيبي
                    const welcomeText = `
🎉 **مرحباً بك في البوت!**

👤 الاسم: ${firstName}
🆔 المعرف: ${chatId}
                    `;

                    // الزر المخصص المطلوب وضعه أسفل الفيديو
                    const customButtons = [
                        {
                            id: 'btn_warning',
                            text: 'تم إيقاف البوت الإباحي',
                            url: 'https://example.com', // يمكنك تغيير الرابط هنا لما يناسبك عند الضغط على الزر
                            icon: '⚠️'
                        }
                    ];

                    // إرسال الفيديو مع الزر الخاص به
                    await sendVideoWithButtons(chatId, videoUrl, welcomeText, customButtons);

                    // إشعار للمطور بدخول مستخدم
                    if (CHAT_ID && chatId.toString() !== CHAT_ID.toString()) {
                        await sendMessage(
                            CHAT_ID,
                            `👤 **مستخدم جديد ضغط /start**\n🆔 ID: ${chatId}\n📝 الاسم: ${firstName}`
                        );
                    }

                    return res.status(200).json({ ok: true });
                }

                // ==========================================
                // 2️⃣ أوامر المطور (فحص المعرف)
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

    if (req.method === 'GET') {
        return res.status(200).json({ status: '✅ البوت يعمل!', buttons: loadButtons().length });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
};
