const http = require('http');

const data = JSON.stringify({ idToken: 'fake', name: 'Test', loginProvider: 'google' });

const options = {
  hostname: 'localhost',
  port: 5002,
  path: '/api/auth/firebase-login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log('Response:', res.statusCode, body));
});

req.on('error', error => console.error(error));
req.write(data);
req.end();
