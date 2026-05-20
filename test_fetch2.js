const API_URL = 'https://script.google.com/macros/s/AKfycbw9fB9wBGPiHkoO4qmVxyBl69VcDHyhObmYZnq8vew6wBoXn72AILTGw3KBWOuSvjGLnQ/exec';
fetch(API_URL + '?action=read&sheet=Invoices')
  .then(res => res.json())
  .then(json => {
    const today = new Date();
    console.log("Today is:", today);
    if (json.data && json.data.length > 0) {
      const recent = json.data.slice(-20); // last 20
      recent.forEach(inv => {
         console.log(inv.id, '|', inv.createdAt, '=> final:', inv.finalAmount);
      })
    }
  });
