import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  Prompt,
} from '@modelcontextprotocol/sdk/types.js';
import { makeAuthenticatedRequest } from '../db/pocketbase.js';
import { config } from '../config.js';

const PROMPTS: Prompt[] = [
  {
    name: 'troubleshoot',
    description: 'Guide user through problem diagnosis using knowledge base',
    arguments: [
      {
        name: 'problem_description',
        description: 'Description of the problem to troubleshoot',
        required: true,
      },
    ],
  },
  {
    name: 'document_solution',
    description: 'Help extract and document a solution from a resolved incident',
    arguments: [
      {
        name: 'incident_id',
        description: 'ID of the incident to document',
        required: true,
      },
    ],
  },
  {
    name: 'analyze_pattern',
    description: 'Identify recurring issues and patterns in the knowledge base',
    arguments: [
      {
        name: 'category',
        description: 'Optional category to analyze (leave empty for all)',
        required: false,
      },
    ],
  },
];

export function registerPrompts(server: Server) {
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    console.error(`=� Listing ${PROMPTS.length} prompts`);
    return { prompts: PROMPTS };
  });

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    console.error(`=� Getting prompt: ${name}`, args);

    const baseUrl = config.pocketbase.url;

    try {
      switch (name) {
        case 'troubleshoot': {
          const problemDesc = args?.problem_description as string;
          if (!problemDesc) {
            throw new Error('problem_description is required');
          }

          // Search for similar incidents in knowledge base
          const searchResponse = await makeAuthenticatedRequest(
            `${baseUrl}/api/collections/incidents/records?filter=${encodeURIComponent(`title ~ "${problemDesc}" || description ~ "${problemDesc}"`)}&perPage=5&sort=-created`
          );

          let similarIncidents = [];
          if (searchResponse.ok) {
            const data = await searchResponse.json();
            similarIncidents = data.items;
          }

          // Also search for solutions
          let relatedSolutions = [];
          if (similarIncidents.length > 0) {
            const incidentIds = similarIncidents.map((inc: any) => inc.id).join('","');
            const solutionsResponse = await makeAuthenticatedRequest(
              `${baseUrl}/api/collections/solutions/records?filter=${encodeURIComponent(`incident_id IN ("${incidentIds}")`)}&perPage=5`
            );

            if (solutionsResponse.ok) {
              const solutionsData = await solutionsResponse.json();
              relatedSolutions = solutionsData.items;
            }
          }

          const similarIncidentsText = similarIncidents.length > 0
            ? similarIncidents.map((inc: any) =>
                `= **${inc.title}** (${inc.category}, ${inc.severity} severity)\n   ${inc.description.substring(0, 200)}${inc.description.length > 200 ? '...' : ''}\n   Status: ${inc.status} | ID: ${inc.id}\n`
              ).join('\n')
            : 'No similar incidents found in knowledge base.';

          const solutionsText = relatedSolutions.length > 0
            ? relatedSolutions.map((sol: any) =>
                `=� **${sol.solution_title}**\n   ${sol.solution_description.substring(0, 200)}${sol.solution_description.length > 200 ? '...' : ''}\n   Incident ID: ${sol.incident_id}\n`
              ).join('\n')
            : 'No solutions found yet.';

          const prompt = `You are an expert troubleshooting assistant helping the user solve a technical problem.

**Current Problem:**
${problemDesc}

**Similar Incidents from Knowledge Base:**
${similarIncidentsText}

**Related Solutions:**
${solutionsText}

**Troubleshooting Process:**
1. **Understand the Problem**
   - Ask clarifying questions about symptoms, environment, and recent changes
   - Gather technical details (error messages, logs, system info)

2. **Compare with Past Incidents**
   - Review similar incidents above
   - Identify patterns or common solutions

3. **Systematic Diagnosis**
   - Propose step-by-step troubleshooting steps
   - Suggest verification methods at each step

4. **Solution Documentation**
   - If solution found, suggest documenting it for future reference
   - Recommend preventive measures

**Guidelines:**
- Be methodical and thorough
- Consider both common and edge cases
- Prioritize solutions based on likelihood and impact
- Always suggest verifying the solution works
- Recommend logging the outcome

Please guide the user through this troubleshooting process systematically.`;

          return {
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: prompt,
                },
              },
            ],
          };
        }

        case 'document_solution': {
          const incidentId = args?.incident_id as string;
          if (!incidentId) {
            throw new Error('incident_id is required');
          }

          // Get incident details
          const incidentResponse = await makeAuthenticatedRequest(
            `${baseUrl}/api/collections/incidents/records/${incidentId}`
          );

          if (!incidentResponse.ok) {
            throw new Error('Incident not found');
          }

          const incident = await incidentResponse.json();

          // Get existing solutions for this incident
          const solutionsResponse = await makeAuthenticatedRequest(
            `${baseUrl}/api/collections/solutions/records?filter=${encodeURIComponent(`incident_id = "${incidentId}"`)}&perPage=5`
          );

          let existingSolutions = [];
          if (solutionsResponse.ok) {
            const data = await solutionsResponse.json();
            existingSolutions = data.items;
          }

          // Get lessons learned for this incident
          const lessonsResponse = await makeAuthenticatedRequest(
            `${baseUrl}/api/collections/lessons_learned/records?filter=${encodeURIComponent(`incident_id = "${incidentId}"`)}&perPage=5`
          );

          let existingLessons = [];
          if (lessonsResponse.ok) {
            const data = await lessonsResponse.json();
            existingLessons = data.items;
          }

          const solutionsText = existingSolutions.length > 0
            ? existingSolutions.map((sol: any) =>
                `=� **${sol.solution_title}**\n   ${sol.solution_description}\n   Steps: ${sol.steps || 'Not documented'}\n   Effectiveness: Not rated yet\n`
              ).join('\n')
            : 'No solutions documented yet.';

          const lessonsText = existingLessons.length > 0
            ? existingLessons.map((lesson: any) =>
                `=� **Lesson Type:** ${lesson.lesson_type}\n   ${lesson.lesson_text}\n`
              ).join('\n')
            : 'No lessons learned documented yet.';

          const prompt = `You are helping document a comprehensive solution for a resolved technical incident.

**Incident Details:**
- **Title:** ${incident.title}
- **Category:** ${incident.category}
- **Severity:** ${incident.severity}
- **Status:** ${incident.status}
- **Description:** ${incident.description}
- **Symptoms:** ${incident.symptoms || 'Not documented'}
- **Context:** ${incident.context || 'Not documented'}
- **Environment:** ${incident.environment || 'Not documented'}
- **Root Cause:** ${incident.root_cause || 'Not yet identified'}

**Existing Solutions:**
${solutionsText}

**Existing Lessons Learned:**
${lessonsText}

**Documentation Process:**
1. **Extract the Solution**
   - What was the exact fix?
   - What steps were taken to resolve it?
   - What were the key diagnostic insights?

2. **Create Step-by-Step Guide**
   - Break down the solution into clear, actionable steps
   - Include verification steps
   - Note any prerequisites or dependencies

3. **Document Context and Conditions**
   - When does this solution apply?
   - What environment factors matter?
   - Are there warning signs or prerequisites?

4. **Extract Lessons Learned**
   - What caused this issue?
   - How can it be prevented in the future?
   - What monitoring or detection could help?

5. **Suggest Improvements**
   - What could make the solution more robust?
   - Are there alternative approaches?

Please guide the user through documenting this solution comprehensively, ensuring it will be valuable for future troubleshooting.`;

          return {
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: prompt,
                },
              },
            ],
          };
        }

        case 'analyze_pattern': {
          const category = args?.category as string | undefined;

          // Build filter based on category
          const filter = category ? `category = "${category}"` : '';

          // Get incidents for analysis
          const incidentsResponse = await makeAuthenticatedRequest(
            `${baseUrl}/api/collections/incidents/records${filter ? `?filter=${encodeURIComponent(filter)}` : ''}?perPage=100&sort=-created`
          );

          if (!incidentsResponse.ok) {
            throw new Error('Failed to fetch incidents for analysis');
          }

          const incidentsData = await incidentsResponse.json();
          const incidents = incidentsData.items;

          // Get solutions for these incidents
          const incidentIds = incidents.map((inc: any) => inc.id).join('","');
          const solutionsResponse = await makeAuthenticatedRequest(
            `${baseUrl}/api/collections/solutions/records?filter=${encodeURIComponent(`incident_id IN ("${incidentIds}")`)}&perPage=100`
          );

          let solutions = [];
          if (solutionsResponse.ok) {
            const solutionsData = await solutionsResponse.json();
            solutions = solutionsData.items;
          }

          // Calculate basic statistics
          const categoryBreakdown: Record<string, number> = {};
          const severityBreakdown: Record<string, number> = {};
          const statusBreakdown: Record<string, number> = {};

          incidents.forEach((inc: any) => {
            categoryBreakdown[inc.category] = (categoryBreakdown[inc.category] || 0) + 1;
            severityBreakdown[inc.severity] = (severityBreakdown[inc.severity] || 0) + 1;
            statusBreakdown[inc.status] = (statusBreakdown[inc.status] || 0) + 1;
          });

          const recentIncidents = incidents.slice(0, 10);
          const unresolvedIncidents = incidents.filter((inc: any) => inc.status !== 'resolved' && inc.status !== 'archived');

          const prompt = `You are analyzing patterns in the technical incident knowledge base to identify trends and improvement opportunities.

**Analysis Scope:**
${category ? `Category: ${category}` : 'All categories'}
- **Total Incidents:** ${incidents.length}
- **Total Solutions:** ${solutions.length}
- **Unresolved Incidents:** ${unresolvedIncidents.length}

**Incident Breakdown:**
- **By Category:** ${JSON.stringify(categoryBreakdown, null, 2)}
- **By Severity:** ${JSON.stringify(severityBreakdown, null, 2)}
- **By Status:** ${JSON.stringify(statusBreakdown, null, 2)}

**Recent Incidents (Last 10):**
${recentIncidents.map((inc: any) =>
  `- **${inc.title}** (${inc.category}, ${inc.severity}) - ${inc.status}`
).join('\n')}

**Analysis Framework:**
1. **Identify Recurring Problems**
   - What issues appear frequently?
   - Are there common patterns in titles or descriptions?
   - Which categories have the most incidents?

2. **Root Cause Patterns**
   - What are the common underlying causes?
   - Are there environmental or systemic factors?
   - What prevents these issues from being caught earlier?

3. **Solution Effectiveness**
   - Which types of problems have good solutions documented?
   - What gaps exist in solution coverage?
   - Are solutions being reused effectively?

4. **Process Improvements**
   - What preventive measures could reduce incident frequency?
   - Are there opportunities for better monitoring or alerts?
   - What knowledge sharing could improve response times?

5. **Knowledge Base Health**
   - Are incidents being properly categorized and documented?
   - Is there good balance between incidents and solutions?
   - What areas need better documentation?

**Deliverables:**
- Summary of key patterns and trends
- Recommendations for prevention
- Suggestions for knowledge base improvements
- Priority areas for further investigation

Please provide a comprehensive analysis with actionable insights.`;

          return {
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: prompt,
                },
              },
            ],
          };
        }

        default:
          throw new Error(`Unknown prompt: ${name}`);
      }
    } catch (error: any) {
      console.error(`L Prompt ${name} failed: ${error.message}`);
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Error loading prompt ${name}: ${error.message}`,
            },
          },
        ],
      };
    }
  });
}