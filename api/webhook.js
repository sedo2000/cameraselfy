// ============================================
// 🎬 دالة إرسال فيديو مع أزرار (نسخة آمنة)
// ============================================
async function sendVideoWithButtons(chatId, videoUrl, caption, buttons = null) {
    const payload = {
        chat_id: chatId,
        video: videoUrl,
        caption: caption,
        parse_mode: 'Markdown'
    };

    if (buttons && buttons.length > 0) {
        payload.reply_markup = {
            inline_keyboard: buttons.map(btn => [{
                text: btn.icon ? `${btn.icon} ${btn.text}` : btn.text,
                callback_data: btn.callback_data || 'noop',
                style: btn.style || 'primary' 
            }])
        };
    }

    try {
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendVideo`, payload);
        return { success: true };
    } catch (error) {
        console.error('⚠️ فشل باللون الملون، جاري الإرسال بدونه...');
        // 🔄 خطة بديلة: إذا فشل بسبب الميزة الجديدة، نحذف الـ style ونرسل كزر عادي فوراً لضمان عدم التوقف
        if (payload.reply_markup?.inline_keyboard) {
            payload.reply_markup.inline_keyboard = payload.reply_markup.inline_keyboard.map(row => 
                row.map(({ style, ...rest }) => rest)
            );
            try {
                await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendVideo`, payload);
                return { success: true };
            } catch (retryError) {
                console.error('❌ فشل إرسال الفيديو تماماً:', retryError.message);
                return { success: false, error: retryError.message };
            }
        }
        return { success: false, error: error.message };
    }
}

// ============================================
// 📨 دالة إرسال رسالة مع أزرار (نسخة آمنة)
// ============================================
async function sendMessageWithButtons(chatId, text, buttons = null) {
    const payload = {
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown',
        disable_web_page_preview: false
    };

    if (buttons && buttons.length > 0) {
        payload.reply_markup = {
            inline_keyboard: buttons.map(btn => [{
                text: btn.icon ? `${btn.icon} ${btn.text}` : btn.text,
                callback_data: btn.callback_data || 'noop',
                style: btn.style || 'primary'
            }])
        };
    }

    try {
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, payload);
        return { success: true };
    } catch (error) {
        console.error('⚠️ فشل باللون الملون، جاري الإرسال بدونه...');
        if (payload.reply_markup?.inline_keyboard) {
            payload.reply_markup.inline_keyboard = payload.reply_markup.inline_keyboard.map(row => 
                row.map(({ style, ...rest }) => rest)
            );
            try {
                await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, payload);
                return { success: true };
            } catch (retryError) {
                console.error('❌ فشل الإرسال تماماً:', retryError.message);
                return { success: false, error: retryError.message };
            }
        }
        return { success: false, error: error.message };
    }
}
