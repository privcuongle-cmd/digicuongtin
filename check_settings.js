
import fetch from 'node-fetch';

const API_URL = 'https://script.google.com/macros/s/AKfycbw9fB9wBGPiHkoO4qmVxyBl69VcDHyhObmYZnq8vew6wBoXn72AILTGw3KBWOuSvjGLnQ/exec';

async function check() {
  try {
    const res = await fetch(`${API_URL}?action=read&sheet=TelegramSettings`);
    const json = await res.json();
    console.log('TelegramSettings:', JSON.stringify(json, null, 2));
  } catch (e) {
    console.error('Error:', e);
  }
}

check();
