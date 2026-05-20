const API_URL = 'https://script.google.com/macros/s/AKfycbw9fB9wBGPiHkoO4qmVxyBl69VcDHyhObmYZnq8vew6wBoXn72AILTGw3KBWOuSvjGLnQ/exec';
fetch(API_URL + '?action=read&sheet=Invoices')
  .then(res => res.json())
  .then(json => {
    if (json.data && json.data.length > 0) {
      console.log("Headers:", Object.keys(json.data[0]));
      console.log("Last item:", json.data[json.data.length - 1]);
    }
  });
