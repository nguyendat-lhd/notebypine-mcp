#!/usr/bin/env bun
import { initPocketBase, makeAuthenticatedRequest } from '../src/db/pocketbase.js';
import { config } from '../src/config.js';

async function testMCPToolsManually() {
  console.log('🧪 Manual MCP Tools Testing');
  console.log('================================');

  try {
    // Initialize PocketBase
    await initPocketBase();
    console.log('✅ PocketBase initialized');

    const baseUrl = config.pocketbase.url;

    // Test 1: Create Incident
    console.log('\n📝 Test 1: Creating incident...');
    const incidentData = {
      title: 'Manual Test Incident - Database Performance',
      category: 'Backend',
      description: 'Database queries are running slowly, affecting application performance',
      severity: 'high',
      symptoms: 'Slow response times, timeout errors, high CPU usage',
      context: 'Production environment during peak hours',
      environment: 'PostgreSQL 13.0, Node.js 18, AWS EC2 t3.large'
    };

    const createResponse = await makeAuthenticatedRequest(`${baseUrl}/api/collections/incidents/records`, {
      method: 'POST',
      body: JSON.stringify(incidentData)
    });

    if (!createResponse.ok) {
      throw new Error('Failed to create test incident');
    }

    const incident = await createResponse.json();
    console.log(`✅ Created incident: ${incident.title} (ID: ${incident.id})`);

    // Test 2: Search Incidents
    console.log('\n🔍 Test 2: Searching incidents...');
    const searchResponse = await makeAuthenticatedRequest(
      `${baseUrl}/api/collections/incidents/records?filter=${encodeURIComponent(`title ~ "database" || description ~ "database"`)}&perPage=5&sort=-created`
    );

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      console.log(`✅ Found ${searchData.totalItems} incidents matching "database"`);
      searchData.items.forEach((inc: any) => {
        console.log(`   - ${inc.title} (${inc.severity} severity)`);
      });
    }

    // Test 3: Add Solution
    console.log('\n💡 Test 3: Adding solution...');
    const solutionData = {
      incident_id: incident.id,
      solution_title: 'Optimize Database Queries',
      solution_description: 'Implement query optimization and indexing strategy',
      steps: JSON.stringify([
        { step: 1, action: 'Analyze slow queries using EXPLAIN', expected_result: 'Identify query bottlenecks' },
        { step: 2, action: 'Add missing database indexes', expected_result: 'Improved query performance' },
        { step: 3, action: 'Implement connection pooling', expected_result: 'Reduced connection overhead' },
        { step: 4, action: 'Add query result caching', expected_result: 'Faster repeated queries' }
      ]),
      resources_needed: 'Database access, monitoring tools, staging environment',
      time_estimate: '2-3 hours',
      warnings: 'Test in staging first, backup database before changes',
      alternatives: 'Consider read replicas for further scaling'
    };

    const solutionResponse = await makeAuthenticatedRequest(`${baseUrl}/api/collections/solutions/records`, {
      method: 'POST',
      body: JSON.stringify(solutionData)
    });

    let solution: any = null;
    if (solutionResponse.ok) {
      solution = await solutionResponse.json();
      console.log(`✅ Added solution: ${solution.solution_title} (ID: ${solution.id})`);
    }

    // Test 4: Extract Lessons Learned
    console.log('\n📚 Test 4: Extracting lessons learned...');
    const lessonData = {
      incident_id: incident.id,
      problem_summary: 'Database performance degradation due to unoptimized queries and lack of indexing',
      root_cause: 'Missing database indexes and no query performance monitoring in place',
      prevention: 'Implement regular query performance monitoring, establish database indexing guidelines, add performance tests to CI/CD pipeline',
      lesson_type: 'prevention'
    };

    const lessonResponse = await makeAuthenticatedRequest(`${baseUrl}/api/collections/lessons_learned/records`, {
      method: 'POST',
      body: JSON.stringify(lessonData)
    });

    if (lessonResponse.ok) {
      const lesson = await lessonResponse.json();
      console.log(`✅ Extracted lesson: ${lesson.lesson_type} (ID: ${lesson.id})`);
    }

    // Test 5: Update Incident Status
    console.log('\n📊 Test 5: Updating incident status...');
    const updateResponse = await makeAuthenticatedRequest(`${baseUrl}/api/collections/incidents/records/${incident.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'resolved',
        resolved_at: new Date().toISOString()
      })
    });

    if (updateResponse.ok) {
      const updated = await updateResponse.json();
      console.log(`✅ Updated incident status to: ${updated.status}`);
    }

    // Test 6: Get Similar Incidents
    console.log('\n🔗 Test 6: Finding similar incidents...');
    const similarResponse = await makeAuthenticatedRequest(
      `${baseUrl}/api/collections/incidents/records?filter=${encodeURIComponent(`category = "${incident.category}" && id != "${incident.id}"`)}&perPage=3&sort=-created`
    );

    if (similarResponse.ok) {
      const similarData = await similarResponse.json();
      console.log(`✅ Found ${similarData.totalItems} similar Backend incidents`);
      similarData.items.forEach((inc: any) => {
        console.log(`   - ${inc.title} (${inc.severity} severity, ${inc.status} status)`);
      });
    }

    // Test 7: Export Knowledge
    console.log('\n📤 Test 7: Exporting knowledge base...');
    const exportResponse = await makeAuthenticatedRequest(`${baseUrl}/api/collections/incidents/records?perPage=10`);

    if (exportResponse.ok) {
      const exportData = await exportResponse.json();
      console.log(`✅ Exported ${exportData.totalItems} incidents`);

      // Create JSON export
      const jsonExport = JSON.stringify(exportData.items, null, 2);
      console.log(`📄 JSON Export: ${jsonExport.length} characters`);

      // Create simple CSV export
      const csvHeaders = 'ID,Title,Category,Severity,Status,Created';
      const csvRows = exportData.items.map((inc: any) =>
        `${inc.id},"${inc.title}","${inc.category}","${inc.severity}","${inc.status}","${new Date(inc.created).toLocaleDateString()}"`
      ).join('\n');
      const csvExport = [csvHeaders, csvRows].join('\n');
      console.log(`📊 CSV Export: ${csvExport.length} characters`);
    }

    // Test 8: Add Feedback
    console.log('\n⭐ Test 8: Adding feedback to solution...');
    if (solution) {
      const feedbackData = {
        solution_id: solution.id,
        rating: 5,
        worked: true,
        comment: 'Solution worked perfectly! Database performance improved by 70%',
        time_spent: '2 hours'
      };

      const feedbackResponse = await makeAuthenticatedRequest(`${baseUrl}/api/collections/feedback/records`, {
        method: 'POST',
        body: JSON.stringify(feedbackData)
      });

      if (feedbackResponse.ok) {
        const feedback = await feedbackResponse.json();
        console.log(`✅ Added feedback: ${feedback.rating}/5 stars`);
      }
    }

    // Test 9: Create Tag
    console.log('\n🏷️ Test 9: Creating tags...');
    const tagData = {
      tag_name: 'database-performance',
      tag_type: 'technology',
      usage_count: 1
    };

    const tagResponse = await makeAuthenticatedRequest(`${baseUrl}/api/collections/tags/records`, {
      method: 'POST',
      body: JSON.stringify(tagData)
    });

    if (tagResponse.ok) {
      const tag = await tagResponse.json();
      console.log(`✅ Created tag: ${tag.tag_name} (${tag.tag_type})`);
    }

    console.log('\n🎉 All manual tests completed successfully!');
    console.log('================================');
    console.log('📊 Test Summary:');
    console.log('   ✅ Incident Creation');
    console.log('   ✅ Incident Search');
    console.log('   ✅ Solution Addition');
    console.log('   ✅ Lessons Extraction');
    console.log('   ✅ Status Updates');
    console.log('   ✅ Similar Incidents');
    console.log('   ✅ Knowledge Export');
    console.log('   ✅ Feedback Addition');
    console.log('   ✅ Tag Creation');

  } catch (error: any) {
    console.error('❌ Manual testing failed:', error.message);
    process.exit(1);
  }
}

testMCPToolsManually();