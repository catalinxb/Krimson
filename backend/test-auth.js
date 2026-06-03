const http = require('http');

const loginData = JSON.stringify({
  email: 'trader@example.com',
  password: 'TraderPass123!'
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length
  }
};

console.log('Testing auth endpoint...');

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    try {
      const json = JSON.parse(data);
      console.log('Response:', JSON.stringify(json, null, 2));
      if (json.user) {
        console.log('\n✓ Login successful!');
        console.log('  Email:', json.user.email);
        console.log('  Roles:', json.user.roles.map(r => r.name).join(', '));
        console.log('  Token present:', !!json.accessToken);
        console.log('  Session present:', !!json.session);
      } else if (json.error) {
        console.log('\n✗ Login error:', json.error);
      }
    } catch (e) {
      console.log('Response:', data);
    }
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error('Request error:', e);
  process.exit(1);
});

req.write(loginData);
req.end();
