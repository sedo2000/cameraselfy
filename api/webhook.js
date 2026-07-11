// api/webhook.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ============================================
// 🔑 متغيرات البيئة (من Vercel)
// ============================================
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

// ============================================
// 📁 ملف الأزرار (في Vercel، الملفات مؤقتة)
// ============================================
// ⚠️ تنبيه: في Vercel، لا يمكن الكتابة على نظام الملفات.
// سنستخدم متغير بيئة لتخزين الأزرار، أو سنستخدم ملفًا مؤقتًا.
// لكن الحل الأفضل هو استخدام قاعدة بيانات (مثل Vercel KV أو MongoDB).
// للتبسيط، سنستخدم متغير بيئة JSON.

// قراءة الأزرار من متغير البيئة
function loadButtons() {
    try {
        const buttonsJson = process.env.BUTTONS || '[]';
        return JSON.parse(buttonsJson);
    } catch {
        return [];
    }
}

// حفظ الأزرار (في Vercel، سنحدث المتغير عبر API)
// لكن للتبسيط، سنستخدم ملفًا مؤقتًا (قد لا يعمل بشكل دائم)
const BUTTONS_FILE = path.join('/tmp', 'buttons.json');

function loadButtonsFromFile() {
    try {
        if (fs.existsSync(BUTTONS_FILE)) {
            return JSON.parse(fs.readFileSync(BUTTONS_FILE, 'utf8'));
        }
        return [];
    } catch {
        return [];
    }
}

function saveButtonsToFile(buttons) {
    try {
        fs.writeFileSync(BUTTONS_FILE, JSON.stringify(buttons, null, 2));
        return true;
    } catch {
        return false;
    }
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
// 🌐 معالج Webhook
// ============================================
module.exports = async (req, res) => {
    // السماح بـ CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // 1️⃣ معالجة طلبات GET (للتحقق)
    if (req.method === 'GET') {
        return res.status(200).json({
            status: '✅ البوت يعمل!',
            webhook: '/api/webhook',
            buttons: loadButtonsFromFile().length
        });
    }

    // 2️⃣ معالجة طلبات POST (من تليجرام)
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
                    const buttons = loadButtonsFromFile();
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

                    return res.status(200).json({ status: 'ok' });
                }

                // ==========================================
                // 2️⃣ أوامر المطور
                // ==========================================
                if (chatId.toString() === CHAT_ID?.toString()) {
                    const buttons = loadButtonsFromFile();

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
                        return res.status(200).json({ status: 'ok' });
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

                            const buttonsList = loadButtonsFromFile();
                            buttonsList.push(newButton);
                            saveButtonsToFile(buttonsList);

                            await sendTelegramMessage(chatId, `
✅ **تم إضافة الزر!**
📌 الاسم: ${newButton.text}
📊 العدد: ${buttonsList.length}
                            `);
                        } else {
                            await sendTelegramMessage(chatId, `
❌ **صيغة خاطئة!**
✅ الصيغة: \`/add|الاسم|الرابط|الصورة\`
📌 مثال: \`/add|موقعي|https://example.com|🌐\`
                            `);
                        }
                        return res.status(200).json({ status: 'ok' });
                    }

                    // /list
                    if (text === '/list') {
                        const buttonsList = loadButtonsFromFile();
                        if (buttonsList.length === 0) {
                            await sendTelegramMessage(chatId, '📭 لا توجد أزرار.');
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
                        return res.status(200).json({ status: 'ok' });
                    }

                    // /remove
                    if (text.startsWith('/remove')) {
                        const parts = text.split(' ');
                        if (parts.length >= 2) {
                            const buttonId = parts[1];
                            let buttonsList = loadButtonsFromFile();
                            const filtered = buttonsList.filter(b => b.id !== buttonId);

                            if (filtered.length < buttonsList.length) {
                                saveButtonsToFile(filtered);
                                await sendTelegramMessage(chatId, `
✅ **تم الحذف!**
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
                        return res.status(200).json({ status: 'ok' });
                    }

                    // /edit
                    if (text.startsWith('/edit')) {
                        const parts = text.split('|');
                        if (parts.length >= 4) {
                            const buttonId = parts[1]?.trim();
                            const newText = parts[2]?.trim();
                            const newUrl = parts[3]?.trim();
                            const newIcon = parts[4]?.trim();

                            let buttonsList = loadButtonsFromFile();
                            const index = buttonsList.findIndex(b => b.id === buttonId);

                            if (index !== -1) {
                                buttonsList[index].text = newText || buttonsList[index].text;
                                buttonsList[index].url = newUrl || buttonsList[index].url;
                                buttonsList[index].icon = newIcon || buttonsList[index].icon;
                                saveButtonsToFile(buttonsList);

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
                        return res.status(200).json({ status: 'ok' });
                    }
                }

                // ==========================================
                // 3️⃣ أي رسالة أخرى
                // ==========================================
                const buttonsList = loadButtonsFromFile();
                await sendTelegramMessage(chatId, `
👋 مرحباً بك في البوت!

📌 استخدم الأزرار أدناه للتنقل.
🆘 للمساعدة اكتب /start
                `, buttonsList);
            }

            return res.status(200).json({ status: 'ok' });
        } catch (error) {
            console.error('❌ خطأ:', error);
            return res.status(200).json({ status: 'error', message: error.message });
        }
    }

    // 3️⃣ طرق أخرى
    return res.status(405).json({ error: 'Method Not Allowed' });
};
