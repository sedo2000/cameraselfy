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
    // محاولة حفظ في متغير البيئة (مؤقت)
    // للحل الدائم استخدم قاعدة بيانات
    return true;
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

    // ==========================================
    // /admin - عرض لوحة المساعدة
    // ==========================================
    if (text === '/admin') {
        const helpText = `
🔐 **لوحة تحكم المطور**

📊 عدد الأزرار: ${buttons.length}

📌 **الأوامر المتاحة:**

\`/admin\` - عرض هذه القائمة

➖➖➖➖➖➖➖➖
**➕ إضافة زر:**
\`/add|الاسم|الرابط|الصورة\`
مثال: \`/add|موقعي|https://ex.com|🌐\`

➖➖➖➖➖➖➖➖
**📋 عرض الأزرار:**
\`/list\`

➖➖➖➖➖➖➖➖
**🗑️ حذف زر:**
\`/remove ID\`
مثال: \`/remove btn_1234567890\`

➖➖➖➖➖➖➖➖
**✏️ تعديل زر:**
\`/edit|ID|الاسم|الرابط|الصورة\`
مثال: \`/edit|btn_123|موقعي|https://new.com|📌\`

➖➖➖➖➖➖➖➖
**🌐 لوحة التحكم:**
\`/dashboard\` - رابط لوحة التحكم
        `;
        await sendMessage(chatId, helpText);
        return true;
    }

    // ==========================================
    // /dashboard - رابط لوحة التحكم
    // ==========================================
    if (text === '/dashboard') {
        const domain = process.env.VERCEL_URL || 'cameraselfy.vercel.app';
        await sendMessage(chatId, `
🖥️ **لوحة تحكم المطور**

افتح الرابط التالي في المتصفح:

\`https://${domain}/dashboard.html\`

📌 يمكنك من خلالها:
✅ إضافة أزرار جديدة
✏️ تعديل الأزرار الموجودة
🗑️ حذف الأزرار
        `);
        return true;
    }

    // ==========================================
    // /add - إضافة زر جديد
    // ==========================================
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

            await sendMessage(chatId, `
✅ **تم إضافة الزر بنجاح!**

📌 الاسم: ${newButton.text}
🔗 الرابط: ${newButton.url}
🖼️ الصورة: ${newButton.icon}
🆔 المعرف: \`${newButton.id}\`

📊 العدد الإجمالي: ${buttonsList.length}
            `);
        } else {
            await sendMessage(chatId, `
❌ **صيغة خاطئة!**

✅ الصيغة الصحيحة:
\`/add|الاسم|الرابط|الصورة\`

📌 مثال:
\`/add|موقعي|https://example.com|🌐\`
            `);
        }
        return true;
    }

    // ==========================================
    // /list - عرض جميع الأزرار
    // ==========================================
    if (text === '/list') {
        const buttonsList = loadButtons();
        if (buttonsList.length === 0) {
            await sendMessage(chatId, '📭 لا توجد أزرار حالياً.');
        } else {
            let listText = '📋 **قائمة الأزرار:**\n\n';
            buttonsList.forEach((btn, i) => {
                listText += `${i+1}. *${btn.text}*\n`;
                listText += `   🆔: \`${btn.id}\`\n`;
                listText += `   🔗: ${btn.url}\n`;
                listText += `   🖼️: ${btn.icon}\n\n`;
            });
            listText += `\n📊 العدد الإجمالي: ${buttonsList.length}`;
            await sendMessage(chatId, listText);
        }
        return true;
    }

    // ==========================================
    // /remove - حذف زر
    // ==========================================
    if (text.startsWith('/remove')) {
        const parts = text.split(' ');
        if (parts.length >= 2) {
            const buttonId = parts[1].trim();
            let buttonsList = loadButtons();
            const filtered = buttonsList.filter(b => b.id !== buttonId);

            if (filtered.length < buttonsList.length) {
                saveButtons(filtered);
                await sendMessage(chatId, `
✅ **تم حذف الزر بنجاح!**

🆔 المعرف: \`${buttonId}\`
📊 العدد المتبقي: ${filtered.length}
                `);
            } else {
                await sendMessage(chatId, `❌ لم يتم العثور على زر بهذا المعرف: \`${buttonId}\``);
            }
        } else {
            await sendMessage(chatId, `
❌ **صيغة خاطئة!**

✅ الصيغة الصحيحة:
\`/remove ID\`

📌 مثال:
\`/remove btn_1234567890\`
            `);
        }
        return true;
    }

    // ==========================================
    // /edit - تعديل زر
    // ==========================================
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

                await sendMessage(chatId, `
✅ **تم تعديل الزر بنجاح!**

📌 الاسم: ${buttonsList[index].text}
🔗 الرابط: ${buttonsList[index].url}
🖼️ الصورة: ${buttonsList[index].icon}
🆔 المعرف: \`${buttonId}\`
                `);
            } else {
                await sendMessage(chatId, `❌ لم يتم العثور على زر بهذا المعرف: \`${buttonId}\``);
            }
        } else {
            await sendMessage(chatId, `
❌ **صيغة خاطئة!**

✅ الصيغة الصحيحة:
\`/edit|ID|الاسم|الرابط|الصورة\`

📌 مثال:
\`/edit|btn_123|موقعي|https://new.com|🌐\`
            `);
        }
        return true;
    }

    return false;
}

// ============================================
// 🌐 المعالج الرئيسي
// ============================================
module.exports = async (req, res) => {
    // 🔹 السماح بـ CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 🔹 معالجة OPTIONS (للـ CORS)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // ============================================
    // 📊 API: جلب الأزرار (للوحة التحكم)
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
    // ➕ API: إضافة زر (للوحة التحكم)
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
    // ✏️ API: تعديل زر (للوحة التحكم)
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
    // 🗑️ API: حذف زر (للوحة التحكم)
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
            console.log('📩 وصول تحديث:', JSON.stringify(update).slice(0, 300));

            // ==========================================
            // معالجة الرسائل
            // ==========================================
            if (update.message) {
                const message = update.message;
                const chatId = message.chat.id;
                const text = message.text || '';
                const firstName = message.from?.first_name || 'مستخدم';

                console.log(`💬 رسالة من ${chatId}: "${text}"`);

                // ==========================================
                // 1️⃣ أمر /start (لجميع المستخدمين)
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

                    await sendMessageWithButtons(chatId, welcomeText, buttons);

                    // إشعار للمطور
                    if (CHAT_ID && chatId.toString() !== CHAT_ID.toString()) {
                        await sendMessage(
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
                    const handled = await handleAdminCommands(chatId, text);
                    if (handled) {
                        return res.status(200).json({ ok: true });
                    }
                }

                // ==========================================
                // 3️⃣ أي رسالة أخرى (للمستخدمين العاديين)
                // ==========================================
                const defaultButtons = loadButtons();
                await sendMessageWithButtons(chatId, `
👋 مرحباً بك في البوت!

📌 استخدم الأزرار أدناه للتنقل.
🆘 للمساعدة اكتب /start
                `, defaultButtons);
            }

            // ==========================================
            // 4️⃣ طلب من الموقع (fromSite)
            // ==========================================
            if (req.body.fromSite) {
                console.log('📸 طلب من الموقع:', req.body);
                if (CHAT_ID) {
                    await sendMessage(
                        CHAT_ID,
                        `📸 **تم الوصول للكاميرا من الموقع!**\n🕒 ${new Date().toLocaleString()}\n📱 ${req.body.userAgent || 'غير معروف'}`
                    );
                }
                return res.status(200).json({ success: true, message: '✅ تم إرسال الإشعار للمطور' });
            }

            return res.status(200).json({ ok: true });

        } catch (error) {
            console.error('❌ خطأ في معالجة Webhook:', error);
            return res.status(200).json({ ok: false, error: error.message });
        }
    }

    // ============================================
    // 🏠 GET - اختبار الـ API
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
