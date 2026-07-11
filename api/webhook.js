// api/webhook.js

// جلب التوكن الخاص بالبوت والمعرف الخاص بك كمطور من المتغيرات البيئية
const BOT_TOKEN = process.env.BOT_TOKEN; 
const DEVELOPER_ID = parseInt(process.env.DEVELOPER_ID); // ضع الآيدي الخاص بك في إعدادات فيرسل

// مصفوفة مؤقتة لتخزين الأزرار المضافة (تأتي افتراضياً مع زر واحد)
let customButtons = [
  { text: "زيارة الموقع الرسمي", url: "https://google.com" }
];

// كائن لتتبع حالة المطور عند الإدخال (مثلاً: هل هو الآن يقوم بكتابة اسم زر جديد؟)
let devState = {}; 

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const update = req.body;
      if (!update || !update.message) {
        return res.status(200).json({ ok: true });
      }

      const chatId = update.message.chat.id;
      const text = update.message.text;
      const isDeveloper = (chatId === DEVELOPER_ID);

      // 1. التعامل مع أوامر المطور (لوحة التحكم الإدارية)
      if (isDeveloper) {
        
        // إذا كان المطور في حالة انتظار إدخال بيانات لزر جديد
        if (devState[chatId]) {
          return await handleDeveloperInputs(chatId, text);
        }

        // الأوامر النصية الأساسية للمطور
        if (text === '/admin') {
          await sendTelegramMessage(chatId, "🛠️ مرحباً بك في لوحة تحكم المطور. اختر الإجراء المطلوب:", [
            [{ text: "➕ إضافة زر جديد", callback_data: "add_btn" }],
            [{ text: "✏️ تعديل زر", callback_data: "edit_btn" }],
            [{ text: "❌ حذف زر", callback_data: "delete_btn" }]
          ], true); // true تعني أزرار داخلية Callback
          return res.status(200).json({ ok: true });
        }
      }

      // 2. التعامل مع الأوامر العامة لجميع المستخدمين (بما فيهم المطور)
      if (text === '/start') {
        // تحويل مصفوفة الأزرار المخصصة إلى الصيغة التي يفهمها تلجرام
        const userButtons = customButtons.map(btn => [{ text: btn.text, url: btn.url }]);
        
        await sendTelegramMessage(
          chatId, 
          "👋 أهلاً بك في البوت الرسمي! إليك الأزرار المتاحة حالياً المنشأة من قبل المطور:", 
          userButtons
        );
      } else {
        await sendTelegramMessage(chatId, "📌 أرسل /start لعرض الأزرار المتاحة.");
      }

      return res.status(200).json({ ok: true });

    } catch (error) {
      console.error('❌ خطأ في معالجة الطلب:', error.message);
      return res.status(200).json({ ok: true }); // نرد دائماً بـ 200 لتلجرام منعاً للتكرار
    }
  }

  // طلبات GET لفحص حالة السيرفر من المتصفح
  if (req.method === 'GET') {
    return res.status(200).json({
      status: '✅ البوت يعمل بنجاح على بيئة لاسيرفرية',
      webhook: '/api/webhook',
      active_buttons: customButtons.length
    });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}

// دالة معالجة مدخلات المطور عند إضافة أو تعديل أو حذف الأزرار نصياً
async function handleDeveloperInputs(chatId, text) {
  const state = devState[chatId];

  if (state.action === 'waiting_for_add') {
    // يتوقع النص بالصيغة: اسم الزر - الرابط
    const parts = text.split('-');
    if (parts.length < 2) {
      await sendTelegramMessage(chatId, "⚠️ صيغة خاطئة. يرجى الإرسال هكذا:\nاسم الزر - الرابط");
      return;
    }
    const btnText = parts[0].trim();
    const btnUrl = parts[1].trim();

    customButtons.push({ text: btnText, url: btnUrl });
    delete devState[chatId];
    await sendTelegramMessage(chatId, `✅ تم إضافة الزر "${btnText}" بنجاح! أرسل /start لمعاينته.`);
  } 
  
  else if (state.action === 'waiting_for_delete') {
    const index = parseInt(text) - 1;
    if (isNaN(index) || index < 0 || index >= customButtons.length) {
      await sendTelegramMessage(chatId, "⚠️ رقم الزر غير صحيح. حاول مجدداً.");
      return;
    }
    const deleted = customButtons.splice(index, 1);
    delete devState[chatId];
    await sendTelegramMessage(chatId, `✅ تم حذف الزر "${deleted[0].text}" بنجاح.`);
  }

  // اختصاراً، يمكنك برمجة التعديل بنفس أسلوب الحذف والإضافة المباشرين
}

// دالة مساعدة لإرسال الرسائل عبر Telegram Bot API لدعم الأزرار العادية والداخلية
async function sendTelegramMessage(chatId, text, replyMarkup = null, isCallback = false) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  
  const payload = {
    chat_id: chatId,
    text: text
  };

  if (replyMarkup) {
    if (isCallback) {
      payload.reply_markup = { inline_keyboard: replyMarkup };
    } else {
      // الأزرار التي تحتوي على روابط توجيهية للمتصفح (URL Buttons)
      payload.reply_markup = { inline_keyboard: replyMarkup };
    }
  }

  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}
