const axios = require('axios');

async function checkStats() {
    try {
        const response = await axios.get('http://localhost:5001/api/stats');
        console.log('Stats Response:');
        console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('Error fetching stats:', error.message);
    }
}

checkStats();
