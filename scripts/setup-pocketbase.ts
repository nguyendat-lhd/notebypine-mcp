#!/usr/bin/env bun
import { config } from '../src/config.js';

async function setupDatabase() {
  const baseUrl = config.pocketbase.url;
  let adminToken: string;

  try {
    // Check if PocketBase is running
    const healthResponse = await fetch(`${baseUrl}/api/health`);
    if (!healthResponse.ok) {
      throw new Error('PocketBase is not running');
    }
    console.log('✅ PocketBase is running');

    // Authenticate as admin
    const authResponse = await fetch(`${baseUrl}/api/admins/auth-with-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        identity: config.pocketbase.adminEmail,
        password: config.pocketbase.adminPassword,
      }),
    });

    if (!authResponse.ok) {
      throw new Error(`Admin authentication failed: ${authResponse.status}`);
    }

    const authData = await authResponse.json();
    adminToken = authData.token;
    console.log('✅ Admin authentication successful');

    console.log('🔧 Setting up database collections...');

    // Helper function to create collections
    async function createCollection(name: string, schema: any[]) {
      try {
        const response = await fetch(`${baseUrl}/api/collections`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            name,
            type: 'base',
            schema,
          }),
        });

        if (response.ok) {
          console.log(`✅ Created collection: ${name}`);
          return await response.json();
        } else {
          const error = await response.json();
          if (response.status === 400 && error.data?.name?.code === 'validation_invalid_collection_name') {
            console.log(`⏭️  Collection "${name}" already exists, skipping`);
            // Get existing collection
            const existingResponse = await fetch(`${baseUrl}/api/collections?filter=(name='${name}')`, {
              headers: {
                'Authorization': `Bearer ${adminToken}`,
              },
            });
            const existingData = await existingResponse.json();
            return existingData.items[0];
          } else {
            console.warn(`⚠️ Could not create collection ${name}:`, error.message || error);
            // Try to get existing collection
            try {
              const existingResponse = await fetch(`${baseUrl}/api/collections?filter=(name='${name}')`, {
                headers: {
                  'Authorization': `Bearer ${adminToken}`,
                },
              });
              const existingData = await existingResponse.json();
              if (existingData.items && existingData.items.length > 0) {
                console.log(`✅ Found existing collection: ${name}`);
                return existingData.items[0];
              }
            } catch (existingError) {
              console.warn(`Could not find existing collection ${name}`);
            }
            throw new Error(`Failed to create ${name}: ${error.message || JSON.stringify(error)}`);
          }
        }
      } catch (error: any) {
        console.warn(`⚠️ Could not create ${name} collection:`, error.message);
        throw error;
      }
    }

    // Create incidents collection first (no dependencies) - simplified schema
    const incidentsCollection = await createCollection("incidents", [
      { name: "title", type: "text", required: true },
      { name: "category", type: "select", required: true, options: { values: ["Backend", "Frontend", "DevOps", "Health", "Finance", "Mobile"] } },
      { name: "description", type: "text", required: true },
      { name: "symptoms", type: "json" },
      { name: "context", type: "json" },
      { name: "environment", type: "json" },
      { name: "severity", type: "select", required: true, options: { values: ["low", "medium", "high", "critical"] } },
      { name: "status", type: "select", required: true, options: { values: ["open", "investigating", "resolved", "archived"] } },
      { name: "root_cause", type: "text" },
      { name: "frequency", type: "select", required: true, options: { values: ["one-time", "occasional", "frequent", "recurring"] } },
      { name: "visibility", type: "select", required: true, options: { values: ["private", "team", "public"] } },
      { name: "resolved_at", type: "date" },
    ]);

    // Create tags collection
    await createCollection("tags", [
      { name: "tag_name", type: "text", required: true },
      { name: "tag_type", type: "select", required: true, options: { values: ["symptom", "technology", "skill", "emotion", "context"] } },
      { name: "usage_count", type: "number" },
    ]);

    // Create solutions collection (references incidents)
    await createCollection("solutions", [
      { name: "incident_id", type: "relation", required: true, options: { collectionId: incidentsCollection.id } },
      { name: "solution_title", type: "text", required: true },
      { name: "solution_description", type: "text", required: true },
      { name: "steps", type: "json", required: true },
      { name: "resources_needed", type: "json" },
      { name: "time_estimate", type: "text" },
      { name: "effectiveness_score", type: "number" },
      { name: "warnings", type: "json" },
      { name: "alternatives", type: "json" },
      { name: "is_verified", type: "bool" },
    ]);

    // Create lessons_learned collection (references incidents)
    await createCollection("lessons_learned", [
      { name: "incident_id", type: "relation", required: true, options: { collectionId: incidentsCollection.id } },
      { name: "lesson_text", type: "text", required: true },
      { name: "lesson_type", type: "select", required: true, options: { values: ["prevention", "detection", "response", "recovery", "general"] } },
      { name: "applies_to", type: "json" },
      { name: "importance", type: "number" },
    ]);

    // Get solutions collection for feedback relation
    const solutionsResponse = await fetch(`${baseUrl}/api/collections?filter=(name='solutions')`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
      },
    });
    const solutionsData = await solutionsResponse.json();
    const solutionsCollection = solutionsData.items[0];

    // Create feedback collection (references solutions)
    await createCollection("feedback", [
      { name: "solution_id", type: "relation", required: true, options: { collectionId: solutionsCollection.id } },
      { name: "rating", type: "number", required: true },
      { name: "worked", type: "bool", required: true },
      { name: "comment", type: "text" },
      { name: "time_spent", type: "text" },
    ]);

    // Create knowledge_base collection
    await createCollection("knowledge_base", [
      { name: "title", type: "text", required: true },
      { name: "content", type: "text", required: true },
      { name: "tags", type: "json" },
      { name: "createdBy", type: "text" },
      { name: "updatedBy", type: "text" },
    ]);

    console.log('🎉 Database setup complete!');

  } catch (error: any) {
    console.error('❌ Setup failed:', error.message || error);
    process.exit(1);
  }
}

setupDatabase();