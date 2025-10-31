// Simple test to verify the endpoint works
const fetch = require('node-fetch');

async function testEndpoint() {
    try {
        console.log("Testing API endpoint...");
        const response = await fetch('http://localhost:3000/health');
        const data = await response.json();
        console.log("Health check:", data);
        
        // Test the income summary endpoint
        const testResponse = await fetch('http://localhost:3000/api/income-summary?startDate=2025-10-01&endDate=2025-10-31');
        console.log("Status:", testResponse.status);
        if (!testResponse.ok) {
            const errorData = await testResponse.json();
            console.log("Error data:", errorData);
        } else {
            const jsonData = await testResponse.json();
            console.log("Success - received data structure:", Object.keys(jsonData));
        }
    } catch (error) {
        console.error("Test failed:", error.message);
    }
}

testEndpoint();