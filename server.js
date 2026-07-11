const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();

// ============================================
// 🔑 متغيرات البيئة (من المنصة)
// ============================================
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;  // معرف المطور
const PORT = process.env.PORT || 3000;
const WEBHOOK_URL = process.env.WEBHOOK_URL || `https://your-domain.com/webhook`;

// ============================================
// 📁 ملف تخزين الأزرار
// ============================================
const BUTTONS_FILE = path.join(__dirname, 'buttons.json');

// قراءة الأزرار من الملف
function loadButtons() {
    try {
        if (fs.existsSync(BUTTONS_FILE)) {
            const data = fs.readFileSync(BUTTONS_FILE, 'utf8');
            return JSON.parse(data);
        }
        return [];
    } catch (error) {
        console.error('❌ خطأ في تحميل الأزرار:', error);
        return [];
    }
}

// حفظ الأزرار في الملف
function saveButtons(buttons) {
    try {
        fs.writeFileSync(BUTTONS_FILE, JSON.stringify(buttons, null, 2));
        return true;
    } catch (error) {
        console.error('❌ خطأ في حفظ الأزرار:', error);
        return false;
    }
}

// ============================================
// 🤖 دوال البوت
// ============================================

// إرسال رسالة مع أزرار
async function sendMessageWithButtons(chatId, text, buttons) {
    try {
        // تحويل الأزرار إلى صيغة تليجرام
        const inlineKeyboard = buttons.map(btn => {
            const row = [];
            
            // زر مع رابط وصورة (كـ text مع إيموجي أو صورة)
            const buttonText = btn.icon ? `${btn.icon} ${btn.text}` : btn.text;
            
            row.push({
                text: buttonText,
                url: btn.url
            });
            
            return row;
        });

        const payload = {
            chat_id: chatId,
            text: text,
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: inlineKeyboard
            },
            disable_web_page_preview: false
        };

        const response = await axios.post(
            `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
            payload
        );

        return { success: true, data: response.data };
    } catch (error) {
        console.error('❌ فشل إرسال الرسالة:', error.response?.data || error.message);
        return { success: false, error: error.message };
    }
}

// ============================================
// 🌐 Webhook - استقبال رسائل من تليجرام
// ============================================
app.post('/webhook', express.json(), async (req, res) => {
    try {
        const update = req.body;
        console.log('📩 وصول تحديث:', JSON.stringify(update, null, 2));

        // معالجة الرسائل
        if (update.message) {
            const message = update.message;
            const chatId = message.chat.id;
            const text = message.text || '';

            console.log(`💬 رسالة من ${chatId}: ${text}`);

            // ==========================================
            // 🎯 أوامر البوت
            // ==========================================

            // 1️⃣ أمر /start
            if (text === '/start') {
                const buttons = loadButtons();
                const welcomeText = `
🎉 **مرحباً بك في البوت!**

يمكنك استخدام الأزرار أدناه للتنقل:

📌 *عدد الأزرار:* ${buttons.length}
🔄 *تم التحديث:* ${new Date().toLocaleString()}
                `;

                await sendMessageWithButtons(chatId, welcomeText, buttons);
                
                // إرسال إشعار للمطور
                await sendMessageWithButtons(
                    CHAT_ID,
                    `👤 **مستخدم جديد!**\n🆔 ID: ${chatId}\n📝 الاسم: ${message.from.first_name || 'غير معروف'}`
                );
            }

            // 2️⃣ أمر /admin (لوحة التحكم)
            else if (text === '/admin' && chatId.toString() === CHAT_ID?.toString()) {
                const adminText = `
🔐 **لوحة تحكم المطور**

📊 عدد الأزرار الحالية: ${loadButtons().length}

🔹 **الأوامر المتاحة:**
/add - إضافة زر جديد
/list - عرض الأزرار
/remove [ID] - حذف زر
/edit [ID] - تعديل زر
                `;
                
                await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                    chat_id: chatId,
                    text: adminText,
                    parse_mode: 'Markdown'
                });
            }

            // 3️⃣ أمر /add (إضافة زر)
            else if (text.startsWith('/add') && chatId.toString() === CHAT_ID?.toString()) {
                // صيغة: /add|الاسم|الرابط|الصورة
                const parts = text.split('|');
                if (parts.length >= 3) {
                    const newButton = {
                        id: `btn_${Date.now()}`,
                        text: parts[1]?.trim() || 'زر جديد',
                        url: parts[2]?.trim() || 'https://example.com',
                        icon: parts[3]?.trim() || '🔗'
                    };

                    const buttons = loadButtons();
                    buttons.push(newButton);
                    
                    if (saveButtons(buttons)) {
                        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                            chat_id: chatId,
                            text: `✅ **تم إضافة الزر بنجاح!**

📌 الاسم: ${newButton.text}
🔗 الرابط: ${newButton.url}
🖼️ الصورة: ${newButton.icon}

📊 العدد الإجمالي: ${buttons.length}`,
                            parse_mode: 'Markdown'
                        });
                    }
                } else {
                    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                        chat_id: chatId,
                        text: `❌ **صيغة خاطئة!**

✅ الصيغة الصحيحة:
\`/add|الاسم|الرابط|الصورة\`

📌 مثال:
\`/add|موقعي|https://example.com|🌐\``,
                        parse_mode: 'Markdown'
                    });
                }
            }

            // 4️⃣ أمر /list (عرض الأزرار)
            else if (text === '/list' && chatId.toString() === CHAT_ID?.toString()) {
                const buttons = loadButtons();
                
                if (buttons.length === 0) {
                    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                        chat_id: chatId,
                        text: '📭 لا توجد أزرار حالياً.'
                    });
                    return;
                }

                let listText = '📋 **قائمة الأزرار:**\n\n';
                buttons.forEach((btn, index) => {
                    listText += `${index + 1}. *${btn.text}*\n`;
                    listText += `   🆔: \`${btn.id}\`\n`;
                    listText += `   🔗: ${btn.url}\n`;
                    listText += `   🖼️: ${btn.icon}\n\n`;
                });

                await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                    chat_id: chatId,
                    text: listText,
                    parse_mode: 'Markdown'
                });
            }

            // 5️⃣ أمر /remove (حذف زر)
            else if (text.startsWith('/remove') && chatId.toString() === CHAT_ID?.toString()) {
                const parts = text.split(' ');
                if (parts.length >= 2) {
                    const buttonId = parts[1];
                    let buttons = loadButtons();
                    const filtered = buttons.filter(b => b.id !== buttonId);
                    
                    if (filtered.length < buttons.length) {
                        saveButtons(filtered);
                        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                            chat_id: chatId,
                            text: `✅ **تم حذف الزر بنجاح!**
🆔 ID: ${buttonId}
📊 العدد المتبقي: ${filtered.length}`,
                            parse_mode: 'Markdown'
                        });
                    } else {
                        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                            chat_id: chatId,
                            text: `❌ لم يتم العثور على زر بهذا المعرف: \`${buttonId}\``,
                            parse_mode: 'Markdown'
                        });
                    }
                } else {
                    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                        chat_id: chatId,
                        text: `❌ **صيغة خاطئة!**

✅ الصيغة الصحيحة:
\`/remove [ID]\`

📌 مثال:
\`/remove btn_1234567890\``,
                        parse_mode: 'Markdown'
                    });
                }
            }

            // 6️⃣ أمر /edit (تعديل زر)
            else if (text.startsWith('/edit') && chatId.toString() === CHAT_ID?.toString()) {
                // صيغة: /edit|ID|الاسم|الرابط|الصورة
                const parts = text.split('|');
                if (parts.length >= 4) {
                    const buttonId = parts[1]?.trim();
                    const newText = parts[2]?.trim();
                    const newUrl = parts[3]?.trim();
                    const newIcon = parts[4]?.trim();

                    let buttons = loadButtons();
                    const index = buttons.findIndex(b => b.id === buttonId);
                    
                    if (index !== -1) {
                        buttons[index].text = newText || buttons[index].text;
                        buttons[index].url = newUrl || buttons[index].url;
                        buttons[index].icon = newIcon || buttons[index].icon;
                        
                        saveButtons(buttons);
                        
                        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                            chat_id: chatId,
                            text: `✅ **تم تعديل الزر بنجاح!**

📌 الاسم: ${buttons[index].text}
🔗 الرابط: ${buttons[index].url}
🖼️ الصورة: ${buttons[index].icon}`,
                            parse_mode: 'Markdown'
                        });
                    } else {
                        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                            chat_id: chatId,
                            text: `❌ لم يتم العثور على زر بهذا المعرف: \`${buttonId}\``,
                            parse_mode: 'Markdown'
                        });
                    }
                } else {
                    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                        chat_id: chatId,
                        text: `❌ **صيغة خاطئة!**

✅ الصيغة الصحيحة:
\`/edit|ID|الاسم|الرابط|الصورة\`

📌 مثال:
\`/edit|btn_123|موقعي|https://new.com|🌐\``,
                        parse_mode: 'Markdown'
                    });
                }
            }

            // 7️⃣ أي رسالة أخرى
            else {
                const buttons = loadButtons();
                const replyText = `
👋 مرحباً بك في البوت!

📌 استخدم الأزرار أدناه للتنقل.
🆘 للمساعدة اكتب /help
                `;
                
                await sendMessageWithButtons(chatId, replyText, buttons);
            }
        }

        res.sendStatus(200);
    } catch (error) {
        console.error('❌ خطأ في Webhook:', error);
        res.sendStatus(500);
    }
});

// ============================================
// 🖥️ لوحة تحكم المطور (Dashboard)
// ============================================
app.use(express.static('public'));
app.use(express.json());

// API: جلب الأزرار
app.get('/api/buttons', (req, res) => {
    const buttons = loadButtons();
    res.json({ success: true, buttons });
});

// API: إضافة زر
app.post('/api/buttons/add', (req, res) => {
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
    
    res.json({ success: true, button: newButton });
});

// API: تعديل زر
app.put('/api/buttons/edit/:id', (req, res) => {
    const { id } = req.params;
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
    res.json({ success: true, button: buttons[index] });
});

// API: حذف زر
app.delete('/api/buttons/delete/:id', (req, res) => {
    const { id } = req.params;
    
    let buttons = loadButtons();
    const filtered = buttons.filter(b => b.id !== id);
    
    if (filtered.length === buttons.length) {
        return res.status(404).json({ success: false, error: 'الزر غير موجود' });
    }
    
    saveButtons(filtered);
    res.json({ success: true });
});

// ============================================
// 🏠 تعيين Webhook تلقائياً
// ============================================
async function setWebhook() {
    try {
        const response = await axios.post(
            `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`,
            { url: WEBHOOK_URL }
        );
        console.log('✅ Webhook تم تعيينه بنجاح:', response.data);
    } catch (error) {
        console.error('❌ فشل تعيين Webhook:', error.message);
    }
}

// ============================================
// 🚀 تشغيل السيرفر
// ============================================
app.listen(PORT, async () => {
    console.log(`🚀 السيرفر يعمل على http://localhost:${PORT}`);
    console.log(`📸 صفحة الكاميرا: http://localhost:${PORT}`);
    console.log(`🖥️ لوحة التحكم: http://localhost:${PORT}/dashboard.html`);
    
    if (process.env.NODE_ENV !== 'development') {
        await setWebhook();
    }
});
