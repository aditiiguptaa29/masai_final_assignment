const axios = require('axios');

async function testRateLimit() {
  console.log('Testing auth rate limiter (5 requests max)...');
  
  for (let i = 1; i <= 7; i++) {
    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        email: 'test@test.com',
        password: 'test'
      });
      console.log(`Request ${i}: Status ${response.status}`);
    } catch (error) {
      if (error.response && error.response.status === 429) {
        console.log(`Request ${i}: RATE LIMITED! Status ${error.response.status}`);
        console.log(`Message: ${error.response.data.message || error.response.data}`);
      } else {
        console.log(`Request ${i}: Error ${error.response?.status || 'Unknown'}`);
      }
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

testRateLimit();