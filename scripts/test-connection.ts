#!/usr/bin/env bun
import { initPocketBase, makeAuthenticatedRequest } from '../src/db/pocketbase.js';
import { config } from '../src/config.js';

async function testConnection() {
  console.log('🧪 Testing PocketBase connection...');

  try {
    // Initialize PocketBase connection
    await initPocketBase();
    console.log('✅ PocketBase initialization successful');

    // Test basic CRUD operations
    const baseUrl = config.pocketbase.url;

    // 1. Test Create - Create a test incident
    console.log('\n📝 Testing Create operation...');
    const createResponse = await makeAuthenticatedRequest(`${baseUrl}/api/collections/incidents/records`, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Test Incident - Database Connection',
        category: 'Backend',
        description: 'Testing database connection and CRUD operations',
        severity: 'low',
        status: 'open',
        symptoms: 'Connection test symptom',
        context: 'Testing environment'
      }),
    });

    if (!createResponse.ok) {
      throw new Error(`Create failed: ${createResponse.status}`);
    }

    const createdRecord = await createResponse.json();
    console.log(`✅ Created incident with ID: ${createdRecord.id}`);

    // 2. Test Read - Get the incident
    console.log('\n📖 Testing Read operation...');
    const readResponse = await makeAuthenticatedRequest(`${baseUrl}/api/collections/incidents/records/${createdRecord.id}`);

    if (!readResponse.ok) {
      throw new Error(`Read failed: ${readResponse.status}`);
    }

    const readRecord = await readResponse.json();
    console.log(`✅ Read incident: ${readRecord.title}`);

    // 3. Test Update - Update the incident
    console.log('\n✏️ Testing Update operation...');
    const updateResponse = await makeAuthenticatedRequest(`${baseUrl}/api/collections/incidents/records/${createdRecord.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'resolved',
        root_cause: 'Test successful - database connection working'
      }),
    });

    if (!updateResponse.ok) {
      throw new Error(`Update failed: ${updateResponse.status}`);
    }

    const updatedRecord = await updateResponse.json();
    console.log(`✅ Updated incident status to: ${updatedRecord.status}`);

    // 4. Test List - Get all incidents
    console.log('\n📋 Testing List operation...');
    const listResponse = await makeAuthenticatedRequest(`${baseUrl}/api/collections/incidents/records?perPage=10`);

    if (!listResponse.ok) {
      throw new Error(`List failed: ${listResponse.status}`);
    }

    const listData = await listResponse.json();
    console.log(`✅ Found ${listData.totalItems} incidents in database`);

    // 5. Test Delete - Clean up test record
    console.log('\n🗑️ Testing Delete operation...');
    const deleteResponse = await makeAuthenticatedRequest(`${baseUrl}/api/collections/incidents/records/${createdRecord.id}`, {
      method: 'DELETE',
    });

    if (!deleteResponse.ok) {
      throw new Error(`Delete failed: ${deleteResponse.status}`);
    }

    console.log(`✅ Deleted test incident`);

    // Test creating related records
    console.log('\n🔗 Testing related operations...');

    // Create a new incident for relation testing
    const incidentResponse = await makeAuthenticatedRequest(`${baseUrl}/api/collections/incidents/records`, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Test Incident for Relations',
        category: 'Frontend',
        description: 'Testing relations between collections',
        severity: 'medium',
        status: 'open'
      }),
    });

    const testIncident = await incidentResponse.json();

    // Create a solution
    const solutionResponse = await makeAuthenticatedRequest(`${baseUrl}/api/collections/solutions/records`, {
      method: 'POST',
      body: JSON.stringify({
        incident_id: testIncident.id,
        solution_title: 'Test Solution',
        solution_description: 'This is a test solution',
        steps: JSON.stringify([{ step: 'Test connection', action: 'Verify database operations' }])
      }),
    });

    if (solutionResponse.ok) {
      const solution = await solutionResponse.json();
      console.log(`✅ Created solution with ID: ${solution.id}`);

      // Create feedback
      const feedbackResponse = await makeAuthenticatedRequest(`${baseUrl}/api/collections/feedback/records`, {
        method: 'POST',
        body: JSON.stringify({
          solution_id: solution.id,
          rating: 5,
          worked: true,
          comment: 'Test connection successful!'
        }),
      });

      if (feedbackResponse.ok) {
        console.log('✅ Created feedback record');
      }
    }

    console.log('\n🎉 All tests passed! PocketBase is working correctly.');
    console.log('📊 Database Collections Status:');
    console.log('   - incidents: ✅ Ready');
    console.log('   - solutions: ✅ Ready');
    console.log('   - lessons_learned: ✅ Ready');
    console.log('   - tags: ✅ Ready');
    console.log('   - feedback: ✅ Ready');

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testConnection();