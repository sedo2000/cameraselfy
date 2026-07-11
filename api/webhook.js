// api/webhook.js
const axios = require('axios');

// ============================================
// 🔑 متغيرات البيئة (من Vercel)
// ============================================
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

// ============================================
// 📁 إدارة الأزرار (مخزنة في الذاكرة مؤقتًا)
// ============================================
// ⚠️ تنبيه: في Vercel، يتم إعادة تحميل الوظيفة لكل طلب،
// لذا سنستخدم متغيرًا عامًا للحفاظ على البيانات مؤقتًا
let buttonsCache = [];

function loadButtons() {
    try {
        // محاولة قراءة من متغير بيئة (لتخزين دائم)
        if (process.env.BUTTONS_DATA) {
            return JSON.parse(process.env.BUTTONS_DATA);
        }
        return buttonsCache;
    } catch {
        return buttonsCache;
    }
}

function saveButtons(buttons) {
    buttonsCache = buttons;
    // نعيد حفظها في متغير البيئة (لكن هذا مؤقت)
    // للحل الدائم، استخدم Vercel KV أو MongoDB
    return true;
}

// ============================================
// 📨 إرسال رسالة إلى تليجرام
// ============================================
async function sendTelegramMessage(chatId, text, buttons = null) {
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

        const response = await axios.post(
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
// 🌐 دالة معالجة الطلبات (Webhook)
// ============================================
module.exports = async (req, res) => {
    // إعدادات CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // ============================================
    // معالجة طلبات OPTIONS (للـ CORS)
    // ============================================
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // ============================================
    // 📊 API: جلب الأزرار
    // ============================================
    if (req.method === 'GET' && req.url === '/api/buttons') {
        try {
            const buttons = loadButtons();
            return res.status(200).json({ success: true, buttons });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    // ============================================
    // ➕ API: إضافة زر
    // ============================================
    if (req.method === 'POST' && req.url === '/api/buttons/add') {
        try {
            const { text, url, icon } = req.body;
            
            if (!text || !url) {
                return res.status(400).json({ success: false, error: 'الاسم والرابط مطلوبان' });
            }

            const buttons = loadButtons();
            const newButton = {
                id: `btn_${Date.now()}`,
                text: text.trim(),
                url: url.trim(),
                icon: icon?.trim() || '🔗'
            };
            
            buttons.push(newButton);
            saveButtons(buttons);
            
            return res.status(200).json({ success: true, button: newButton });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    // ============================================
    // ✏️ API: تعديل زر
    // ============================================
    if (req.method === 'PUT' && req.url.startsWith('/api/buttons/edit/')) {
        try {
            const id = req.url.split('/').pop();
            const { text, url, icon } = req.body;
            
            let buttons = loadButtons();
            const index = buttons.findIndex(b => b.id === id);
            
            if (index === -1) {
                return res.status(404).json({ success: false, error: 'الزر غير موجود' });
            }
            
            buttons[index].text = text?.trim() || buttons[index].text;
            buttons[index].url = url?.trim() || buttons[index].url;
            buttons[index].icon = icon?.trim() || buttons[index].icon;
            
            saveButtons(buttons);
            return res.status(200).json({ success: true, button: buttons[index] });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    // ============================================
    // 🗑️ API: حذف زر
    // ============================================
    if (req.method === 'DELETE' && req.url.startsWith('/api/buttons/delete/')) {
        try {
            const id = req.url.split('/').pop();
            let buttons = loadButtons();
            const filtered = buttons.filter(b => b.id !== id);
            
            if (filtered.length === buttons.length) {
                return res.status(404).json({ success: false, error: 'الزر غير موجود' });
            }
            
            saveButtons(filtered);
            return res.status(200).json({ success: true });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    // ============================================
    // 🤖 Webhook من تليجرام (POST)
    // ============================================
    if (req.method === 'POST') {
        try {
            const update = req.body;
            console.log('📩 وصول تحديث:', JSON.stringify(update, null, 2));

            if (update.message) {
                const message = update.message;
                const chatId = message.chat.id;
                const text = message.text || '';
                const firstName = message.from?.first_name || 'مستخدم';

                console.log(`💬 رسالة من ${chatId}: "${text}"`);

                // ==========================================
                // 1️⃣ أمر /start
                // ==========================================
                if (text === '/start') {
                    const buttons = loadButtons();
                    const welcomeText = `
🎉 **مرحباً بك في البوت!**

👤 الاسم: ${firstName}
🆔 المعرف: ${chatId}

📌 استخدم الأزرار أدناه للتنقل.
📊 عدد الأزرار: ${buttons.length}
                    `;

                    await sendTelegramMessage(chatId, welcomeText, buttons);

                    if (CHAT_ID) {
                        await sendTelegramMessage(
                            CHAT_ID,
                            `👤 **مستخدم جديد!**\n🆔 ID: ${chatId}\n📝 الاسم: ${firstName}`
                        );
                    }

                    return res.status(200).json({ ok: true });
                }

                // ==========================================
                // 2️⃣ أوامر المطور (فحص المعرف)
                // ==========================================
                if (chatId.toString() === CHAT_ID?.toString()) {
                    const buttons = loadButtons();

                    // /admin
                    if (text === '/admin') {
                        await sendTelegramMessage(chatId, `
🔐 **لوحة تحكم المطور**

📊 عدد الأزرار: ${buttons.length}

📌 **الأوامر:**
\`/add|الاسم|الرابط|الصورة\` - إضافة زر
\`/list\` - عرض الأزرار
\`/remove ID\` - حذف زر
\`/edit|ID|الاسم|الرابط|الصورة\` - تعديل زر
\`/admin\` - هذه القائمة
                        `);
                        return res.status(200).json({ ok: true });
                    }

                    // /add
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

                            await sendTelegramMessage(chatId, `
✅ **تم إضافة الزر!**
📌 الاسم: ${newButton.text}
🔗 الرابط: ${newButton.url}
🖼️ الصورة: ${newButton.icon}
📊 العدد: ${buttonsList.length}
                            `);
                        } else {
                            await sendTelegramMessage(chatId, `
❌ **صيغة خاطئة!**
✅ الصيغة: \`/add|الاسم|الرابط|الصورة\`
📌 مثال: \`/add|موقعي|https://example.com|🌐\`
                            `);
                        }
                        return res.status(200).json({ ok: true });
                    }

                    // /list
                    if (text === '/list') {
                        const buttonsList = loadButtons();
                        if (buttonsList.length === 0) {
                            await sendTelegramMessage(chatId, '📭 لا توجد أزرار حالياً.');
                        } else {
                            let listText = '📋 **قائمة الأزرار:**\n\n';
                            buttonsList.forEach((btn, i) => {
                                listText += `${i+1}. *${btn.text}*\n`;
                                listText += `   🆔: \`${btn.id}\`\n`;
                                listText += `   🔗: ${btn.url}\n`;
                                listText += `   🖼️: ${btn.icon}\n\n`;
                            });
                            await sendTelegramMessage(chatId, listText);
                        }
                        return res.status(200).json({ ok: true });
                    }

                    // /remove
                    if (text.startsWith('/remove')) {
                        const parts = text.split(' ');
                        if (parts.length >= 2) {
                            const buttonId = parts[1];
                            let buttonsList = loadButtons();
                            const filtered = buttonsList.filter(b => b.id !== buttonId);

                            if (filtered.length < buttonsList.length) {
                                saveButtons(filtered);
                                await sendTelegramMessage(chatId, `
✅ **تم حذف الزر!**
🆔 ID: ${buttonId}
📊 المتبقي: ${filtered.length}
                                `);
                            } else {
                                await sendTelegramMessage(chatId, `❌ الزر \`${buttonId}\` غير موجود.`);
                            }
                        } else {
                            await sendTelegramMessage(chatId, `
❌ **صيغة خاطئة!**
✅ الصيغة: \`/remove ID\`
📌 مثال: \`/remove btn_1234567890\`
                            `);
                        }
                        return res.status(200).json({ ok: true });
                    }

                    // /edit
                    if (text.startsWith('/edit')) {
                        const parts = text.split('|');
                        if (parts.length >= 4) {
                            const buttonId = parts[1]?.trim();
                            const newText = parts[2]?.trim();
                            const newUrl = parts[3]?.trim();
                            const newIcon = parts[4]?.trim();

                            let buttonsList = loadButtons();
                            const index = buttonsList.findIndex(b => b.id === buttonId);

                            if (index !== -1) {
                                buttonsList[index].text = newText || buttonsList[index].text;
                                buttonsList[index].url = newUrl || buttonsList[index].url;
                                buttonsList[index].icon = newIcon || buttonsList[index].icon;
                                saveButtons(buttonsList);

                                await sendTelegramMessage(chatId, `
✅ **تم التعديل!**
📌 الاسم: ${buttonsList[index].text}
🔗 الرابط: ${buttonsList[index].url}
🖼️ الصورة: ${buttonsList[index].icon}
                                `);
                            } else {
                                await sendTelegramMessage(chatId, `❌ الزر \`${buttonId}\` غير موجود.`);
                            }
                        } else {
                            await sendTelegramMessage(chatId, `
❌ **صيغة خاطئة!**
✅ الصيغة: \`/edit|ID|الاسم|الرابط|الصورة\`
📌 مثال: \`/edit|btn_123|موقعي|https://new.com|🌐\`
                            `);
                        }
                        return res.status(200).json({ ok: true });
                    }
                }

                // ==========================================
                // 3️⃣ أي رسالة أخرى للمستخدمين العاديين
                // ==========================================
                const defaultButtons = loadButtons();
                await sendTelegramMessage(chatId, `
👋 مرحباً بك في البوت!

📌 استخدم الأزرار أدناه للتنقل.
🆘 للمساعدة اكتب /start
                `, defaultButtons);
            }

            return res.status(200).json({ ok: true });
        } catch (error) {
            console.error('❌ خطأ في معالجة Webhook:', error);
            return res.status(200).json({ ok: false, error: error.message });
        }
    }

    // ============================================
    // 🏠 صفحة البداية (GET)
    // ============================================
    if (req.method === 'GET') {
        return res.status(200).json({
            status: '✅ البوت يعمل!',
            webhook: '/api/webhook',
            buttons: loadButtons().length,
            time: new Date().toISOString()
        });
    }

    // ============================================
    // ❌ أي طلب غير معروف
    // ============================================
    return res.status(405).json({ error: 'Method Not Allowed' });
};
