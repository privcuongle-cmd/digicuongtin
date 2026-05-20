
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('This browser does not support desktop notification');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

export const sendNotification = (title: string, body: string, icon?: string) => {
  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body,
      icon: icon || '/icon.svg',
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }
};

export const sendTelegramMessage = async (botToken: string, chatId: string, text: string) => {
  if (!botToken || !chatId) return { ok: false, error: 'Missing token or chatId' };
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
      }),
    });
    return await response.json();
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    return { ok: false, error };
  }
};
