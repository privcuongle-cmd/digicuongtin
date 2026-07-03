const API_URL = 'https://script.google.com/macros/s/AKfycbw9fB9wBGPiHkoO4qmVxyBl69VcDHyhObmYZnq8vew6wBoXn72AILTGw3KBWOuSvjGLnQ/exec';

async function search() {
  try {
    const res = await fetch(`${API_URL}?action=read&sheet=Invoices`);
    const result = await res.json();
    const data = result.data || [];
    const found = data.filter(item => 
      String(item.id || '').includes('HD0971') || 
      String(item.id || '').includes('HD0972') || 
      String(item.id || '').includes('HDN0002') ||
      String(item.id || '').includes('HDN0013')
    );
    console.log("MATCHES:");
    console.log(JSON.stringify(found, null, 2));
  } catch (error) {
    console.error(error);
  }
}

search();
