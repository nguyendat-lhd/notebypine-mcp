#!/usr/bin/env bun

/**
 * Test script to create an incident via API
 */

const API_URL = 'http://localhost:3000/api/v1';
const INCIDENT_DATA = {
  title: "API Response Time Degradation",
  description: "Lỗi API Response Time Degradation - Thời gian phản hồi API đang chậm hơn bình thường",
  severity: "critical",
  status: "investigating"
};

async function testCreateIncident() {
  try {
    console.log('🧪 Testing incident creation...');
    console.log('📝 Data:', JSON.stringify(INCIDENT_DATA, null, 2));
    
    // First, try to login to get auth token (if needed)
    // Note: The API might not require auth for admin endpoints
    const response = await fetch(`${API_URL}/incidents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(INCIDENT_DATA),
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Success! Incident created:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.error('❌ Failed to create incident:');
      console.error('Status:', response.status);
      console.error('Response:', JSON.stringify(data, null, 2));
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Test fetching incidents
async function testGetIncidents() {
  try {
    console.log('\n🧪 Testing fetch incidents...');
    
    const response = await fetch(`${API_URL}/incidents?page=1&limit=20`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Success! Fetched incidents:');
      console.log(`Total: ${data.data?.total || 0}`);
      console.log(`Items: ${data.data?.items?.length || 0}`);
      if (data.data?.items?.length > 0) {
        console.log('\nFirst incident:');
        console.log(JSON.stringify(data.data.items[0], null, 2));
      }
    } else {
      console.error('❌ Failed to fetch incidents:');
      console.error('Status:', response.status);
      console.error('Response:', JSON.stringify(data, null, 2));
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run tests
async function main() {
  await testGetIncidents();
  await testCreateIncident();
}

main().catch(console.error);

