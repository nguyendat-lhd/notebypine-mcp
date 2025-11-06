import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  Resource,
} from '@modelcontextprotocol/sdk/types.js';
import { makeAuthenticatedRequest } from '../db/pocketbase.js';
import { config } from '../config.js';

const RESOURCES: Resource[] = [
  {
    uri: 'incident://recent',
    name: 'Recent Incidents',
    description: 'Get the most recent incidents from the knowledge base',
    mimeType: 'application/json',
  },
  {
    uri: 'incident://by-category',
    name: 'Incidents by Category',
    description: 'Get incidents organized by category',
    mimeType: 'application/json',
  },
  {
    uri: 'incident://stats',
    name: 'Knowledge Base Statistics',
    description: 'Get overall statistics about the knowledge base',
    mimeType: 'application/json',
  },
];

export function registerResources(server: Server) {
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    console.error(`=� Listing ${RESOURCES.length} resources`);
    return { resources: RESOURCES };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    console.error(`=� Reading resource: ${uri}`);

    const baseUrl = config.pocketbase.url;

    try {
      switch (uri) {
        case 'incident://recent': {
          const response = await makeAuthenticatedRequest(
            `${baseUrl}/api/collections/incidents/records?perPage=20&sort=-created`
          );

          if (!response.ok) {
            throw new Error('Failed to fetch recent incidents');
          }

          const data = await response.json();
          const recentIncidents = data.items.map((incident: any) => ({
            id: incident.id,
            title: incident.title,
            category: incident.category,
            severity: incident.severity,
            status: incident.status,
            description: incident.description,
            created: incident.created,
            updated: incident.updated
          }));

          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify({
                  total: data.totalItems,
                  incidents: recentIncidents,
                  last_updated: new Date().toISOString()
                }, null, 2),
              },
            ],
          };
        }

        case 'incident://by-category': {
          const categories = ['Backend', 'Frontend', 'DevOps', 'Health', 'Finance', 'Mobile'];
          const byCategory: Record<string, any[]> = {};

          for (const category of categories) {
            const response = await makeAuthenticatedRequest(
              `${baseUrl}/api/collections/incidents/records?filter=category="${category}"&perPage=10&sort=-created`
            );

            if (response.ok) {
              const data = await response.json();
              byCategory[category] = data.items.map((incident: any) => ({
                id: incident.id,
                title: incident.title,
                severity: incident.severity,
                status: incident.status,
                description: incident.description.substring(0, 200) + (incident.description.length > 200 ? '...' : ''),
                created: incident.created
              }));
            } else {
              byCategory[category] = [];
            }
          }

          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify({
                  categories: byCategory,
                  total_categories: Object.keys(byCategory).length,
                  last_updated: new Date().toISOString()
                }, null, 2),
              },
            ],
          };
        }

        case 'incident://stats': {
          // Get basic counts
          const [incidentsResponse, solutionsResponse, lessonsResponse] = await Promise.all([
            makeAuthenticatedRequest(`${baseUrl}/api/collections/incidents/records?perPage=1`),
            makeAuthenticatedRequest(`${baseUrl}/api/collections/solutions/records?perPage=1`),
            makeAuthenticatedRequest(`${baseUrl}/api/collections/lessons_learned/records?perPage=1`),
          ]);

          if (!incidentsResponse.ok || !solutionsResponse.ok || !lessonsResponse.ok) {
            throw new Error('Failed to fetch statistics');
          }

          const incidentsData = await incidentsResponse.json();
          const solutionsData = await solutionsResponse.json();
          const lessonsData = await lessonsResponse.json();

          const stats = {
            overview: {
              total_incidents: incidentsData.totalItems,
              total_solutions: solutionsData.totalItems,
              total_lessons: lessonsData.totalItems,
              last_updated: new Date().toISOString()
            },
            by_status: {},
            by_category: {},
            by_severity: {},
            recent_activity: {
              incidents_this_week: 0,
              solutions_this_week: 0,
              lessons_this_week: 0
            }
          };

          // Get status breakdown
          const statuses = ['open', 'investigating', 'resolved', 'archived'];
          for (const status of statuses) {
            const response = await makeAuthenticatedRequest(
              `${baseUrl}/api/collections/incidents/records?filter=status="${status}"&perPage=1`
            );
            if (response.ok) {
              const data = await response.json();
              stats.by_status[status] = data.totalItems;
            }
          }

          // Get category breakdown
          const categories = ['Backend', 'Frontend', 'DevOps', 'Health', 'Finance', 'Mobile'];
          for (const category of categories) {
            const response = await makeAuthenticatedRequest(
              `${baseUrl}/api/collections/incidents/records?filter=category="${category}"&perPage=1`
            );
            if (response.ok) {
              const data = await response.json();
              stats.by_category[category] = data.totalItems;
            }
          }

          // Get severity breakdown
          const severities = ['low', 'medium', 'high', 'critical'];
          for (const severity of severities) {
            const response = await makeAuthenticatedRequest(
              `${baseUrl}/api/collections/incidents/records?filter=severity="${severity}"&perPage=1`
            );
            if (response.ok) {
              const data = await response.json();
              stats.by_severity[severity] = data.totalItems;
            }
          }

          // Calculate recent activity (last 7 days)
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          const dateFilter = `created >= "${sevenDaysAgo.toISOString()}"`;

          const [recentIncidents, recentSolutions, recentLessons] = await Promise.all([
            makeAuthenticatedRequest(`${baseUrl}/api/collections/incidents/records?filter=${encodeURIComponent(dateFilter)}&perPage=1`),
            makeAuthenticatedRequest(`${baseUrl}/api/collections/solutions/records?filter=${encodeURIComponent(dateFilter)}&perPage=1`),
            makeAuthenticatedRequest(`${baseUrl}/api/collections/lessons_learned/records?filter=${encodeURIComponent(dateFilter)}&perPage=1`),
          ]);

          if (recentIncidents.ok) {
            const data = await recentIncidents.json();
            stats.recent_activity.incidents_this_week = data.totalItems;
          }
          if (recentSolutions.ok) {
            const data = await recentSolutions.json();
            stats.recent_activity.solutions_this_week = data.totalItems;
          }
          if (recentLessons.ok) {
            const data = await recentLessons.json();
            stats.recent_activity.lessons_this_week = data.totalItems;
          }

          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(stats, null, 2),
              },
            ],
          };
        }

        default:
          throw new Error(`Unknown resource: ${uri}`);
      }
    } catch (error: any) {
      console.error(`L Resource ${uri} failed: ${error.message}`);
      return {
        contents: [
          {
            uri,
            mimeType: 'text/plain',
            text: `Error loading resource ${uri}: ${error.message}`
          }
        ]
      };
    }
  });
}