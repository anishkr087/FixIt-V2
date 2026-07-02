const main = async () => {
  console.log('Testing live Render API connection...');
  try {
    const rootRes = await fetch('https://fixit-v2.onrender.com/');
    const rootText = await rootRes.text();
    console.log('Root endpoint response:', rootText);
    
    console.log('\nTesting OTP login endpoint...');
    const loginRes = await fetch('https://fixit-v2.onrender.com/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+919876543210' })
    });
    const loginData = await loginRes.json();
    console.log('Login endpoint status:', loginRes.status);
    console.log('Login endpoint response:', loginData);
    console.log('\n[Success] Cloud API is responsive. Check your Render Dashboard console logs to see the generated OTP printed under [OTP SYSTEM].');
  } catch (err) {
    console.error('Test failed with error:', err.message);
  }
};
main();
