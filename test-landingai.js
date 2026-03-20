import fetch from 'node-fetch';
import FormData from 'form-data';

async function test() {
  const apiKey = 'aWRveXV5N2hhcjgyMDA3dW53dW81OmlmNWhkWXpSdTdZaUY4TkVnOWhFNmpFcWJ3YkplUFY2';
  
  const endpoint = 'https://api.va.landing.ai/v1/tools/agentic-document-analysis';

  const formData = new FormData();
  formData.append('image', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'), {
    filename: 'image.png',
    contentType: 'image/png'
  });

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${apiKey}`,
      ...formData.getHeaders()
    },
    body: formData
  });
  console.log(await response.text());
}

test();
