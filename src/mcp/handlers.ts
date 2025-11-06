import { makeAuthenticatedRequest } from '../db/pocketbase.js';
import { config } from '../config.js';

// Validation helpers
function validateIncidentData(args: any) {
  if (!args.title || typeof args.title !== 'string') {
    throw new Error('Title is required and must be a string');
  }
  if (!args.category || !['Backend', 'Frontend', 'DevOps', 'Health', 'Finance', 'Mobile'].includes(args.category)) {
    throw new Error('Category is required and must be one of: Backend, Frontend, DevOps, Health, Finance, Mobile');
  }
  if (!args.description || typeof args.description !== 'string') {
    throw new Error('Description is required and must be a string');
  }
  if (!args.severity || !['low', 'medium', 'high', 'critical'].includes(args.severity)) {
    throw new Error('Severity is required and must be one of: low, medium, high, critical');
  }
}

function validateSearchArgs(args: any) {
  if (!args.query || typeof args.query !== 'string') {
    throw new Error('Query is required and must be a string');
  }
  const limit = args.limit ? parseInt(args.limit) : 10;
  if (isNaN(limit) || limit < 1 || limit > 100) {
    throw new Error('Limit must be a number between 1 and 100');
  }
  return limit;
}

// Handlers
export async function handleCreateIncident(args: any) {
  validateIncidentData(args);

  const baseUrl = config.pocketbase.url;

  try {
    const response = await makeAuthenticatedRequest(`${baseUrl}/api/collections/incidents/records`, {
      method: 'POST',
      body: JSON.stringify({
        title: args.title,
        category: args.category,
        description: args.description,
        severity: args.severity,
        status: 'open',
        symptoms: args.symptoms || '',
        context: args.context || '',
        environment: args.environment || '',
        frequency: args.frequency || 'one-time',
        visibility: args.visibility || 'private'
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to create incident: ${error.message || 'Unknown error'}`);
    }

    const record = await response.json();

    return {
      content: [
        {
          type: 'text',
          text: ` Incident created successfully!\n\n=� **Details:**\n- **ID:** ${record.id}\n- **Title:** ${record.title}\n- **Category:** ${record.category}\n- **Severity:** ${record.severity}\n- **Status:** ${record.status}\n\n=� You can now add solutions or extract lessons from this incident using the available tools.`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `L Error creating incident: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

export async function handleSearchIncidents(args: any) {
  const limit = validateSearchArgs(args);
  const baseUrl = config.pocketbase.url;

  try {
    // Build filter for search
    let filter = `title ~ "${args.query}" || description ~ "${args.query}"`;

    if (args.category) {
      filter += ` && category = "${args.category}"`;
    }

    if (args.severity) {
      filter += ` && severity = "${args.severity}"`;
    }

    if (args.status) {
      filter += ` && status = "${args.status}"`;
    }

    const response = await makeAuthenticatedRequest(
      `${baseUrl}/api/collections/incidents/records?filter=${encodeURIComponent(filter)}&perPage=${limit}&sort=-created`
    );

    if (!response.ok) {
      throw new Error('Failed to search incidents');
    }

    const data = await response.json();

    if (data.items.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `= No incidents found matching your search criteria.\n\n**Search query:** "${args.query}"\n**Filters:** Category: ${args.category || 'Any'}, Severity: ${args.severity || 'Any'}, Status: ${args.status || 'Any'}`
          }
        ]
      };
    }

    const results = data.items.map((incident: any) =>
      `= **${incident.title}**\n   =� Category: ${incident.category} | =% Severity: ${incident.severity} | =� Status: ${incident.status}\n   =� Description: ${incident.description.substring(0, 200)}${incident.description.length > 200 ? '...' : ''}\n   <� ID: ${incident.id} | =� Created: ${new Date(incident.created).toLocaleDateString()}\n`
    ).join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `= Found ${data.totalItems} incident(s) matching your search:\n\n${results}\n=� Use the incident ID to view details or add solutions.`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `L Error searching incidents: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

export async function handleAddSolution(args: any) {
  if (!args.incident_id || !args.solution_title || !args.solution_description || !args.steps) {
    throw new Error('incident_id, solution_title, solution_description, and steps are required');
  }

  const baseUrl = config.pocketbase.url;

  try {
    // Verify incident exists
    const incidentResponse = await makeAuthenticatedRequest(`${baseUrl}/api/collections/incidents/records/${args.incident_id}`);

    if (!incidentResponse.ok) {
      throw new Error('Incident not found');
    }

    // Create solution
    const response = await makeAuthenticatedRequest(`${baseUrl}/api/collections/solutions/records`, {
      method: 'POST',
      body: JSON.stringify({
        incident_id: args.incident_id,
        solution_title: args.solution_title,
        solution_description: args.solution_description,
        steps: typeof args.steps === 'string' ? args.steps : JSON.stringify(args.steps),
        resources_needed: args.resources_needed || '',
        time_estimate: args.time_estimate || '',
        warnings: args.warnings || '',
        alternatives: args.alternatives || ''
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to add solution: ${error.message || 'Unknown error'}`);
    }

    const solution = await response.json();

    return {
      content: [
        {
          type: 'text',
          text: ` Solution added successfully!\n\n=� **Solution Details:**\n- **ID:** ${solution.id}\n- **Title:** ${solution.solution_title}\n- **Incident ID:** ${solution.incident_id}\n- **Description:** ${solution.solution_description}\n\n=� You can now add feedback to rate this solution's effectiveness.`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `L Error adding solution: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

export async function handleExtractLessons(args: any) {
  if (!args.incident_id || !args.problem_summary || !args.root_cause || !args.prevention) {
    throw new Error('incident_id, problem_summary, root_cause, and prevention are required');
  }

  const baseUrl = config.pocketbase.url;

  try {
    // Verify incident exists
    const incidentResponse = await makeAuthenticatedRequest(`${baseUrl}/api/collections/incidents/records/${args.incident_id}`);

    if (!incidentResponse.ok) {
      throw new Error('Incident not found');
    }

    // Create lesson learned
    const response = await makeAuthenticatedRequest(`${baseUrl}/api/collections/lessons_learned/records`, {
      method: 'POST',
      body: JSON.stringify({
        incident_id: args.incident_id,
        lesson_text: `Problem Summary: ${args.problem_summary}\n\nRoot Cause: ${args.root_cause}\n\nPrevention: ${args.prevention}`,
        lesson_type: args.lesson_type || 'general'
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to extract lesson: ${error.message || 'Unknown error'}`);
    }

    const lesson = await response.json();

    // Update incident with root cause
    await makeAuthenticatedRequest(`${baseUrl}/api/collections/incidents/records/${args.incident_id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        root_cause: args.root_cause
      }),
    });

    return {
      content: [
        {
          type: 'text',
          text: ` Lesson extracted successfully!\n\n=� **Lesson Details:**\n- **ID:** ${lesson.id}\n- **Type:** ${lesson.lesson_type}\n- **Incident ID:** ${lesson.incident_id}\n\n=� **Content:**\n${lesson.lesson_text}\n\n=� This lesson will help prevent similar incidents in the future.`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `L Error extracting lesson: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

export async function handleGetSimilarIncidents(args: any) {
  if (!args.incident_id) {
    throw new Error('incident_id is required');
  }

  const limit = args.limit ? parseInt(args.limit) : 5;
  const baseUrl = config.pocketbase.url;

  try {
    // Get the source incident
    const incidentResponse = await makeAuthenticatedRequest(`${baseUrl}/api/collections/incidents/records/${args.incident_id}`);

    if (!incidentResponse.ok) {
      throw new Error('Incident not found');
    }

    const sourceIncident = await incidentResponse.json();

    // Search for similar incidents based on title, description, and category
    const searchTerms = [sourceIncident.title, sourceIncident.category].join(' ');
    const filter = `(title ~ "${searchTerms}" || description ~ "${searchTerms}") && category = "${sourceIncident.category}" && id != "${args.incident_id}"`;

    const response = await makeAuthenticatedRequest(
      `${baseUrl}/api/collections/incidents/records?filter=${encodeURIComponent(filter)}&perPage=${limit}&sort=-created`
    );

    if (!response.ok) {
      throw new Error('Failed to find similar incidents');
    }

    const data = await response.json();

    if (data.items.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `= No similar incidents found for "${sourceIncident.title}".\n\n=� Try broadening your search or check different categories.`
          }
        ]
      };
    }

    const results = data.items.map((incident: any) =>
      `= **${incident.title}**\n   =� Category: ${incident.category} | =% Severity: ${incident.severity} | =� Status: ${incident.status}\n   =� Description: ${incident.description.substring(0, 150)}${incident.description.length > 150 ? '...' : ''}\n   <� ID: ${incident.id} | =� Created: ${new Date(incident.created).toLocaleDateString()}\n`
    ).join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `= Found ${data.totalItems} similar incident(s) to "${sourceIncident.title}":\n\n${results}\n=� Review these incidents for potential solutions or patterns.`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `L Error finding similar incidents: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

export async function handleUpdateIncidentStatus(args: any) {
  if (!args.incident_id || !args.status) {
    throw new Error('incident_id and status are required');
  }

  if (!['open', 'investigating', 'resolved', 'archived'].includes(args.status)) {
    throw new Error('Status must be one of: open, investigating, resolved, archived');
  }

  const baseUrl = config.pocketbase.url;

  try {
    const updateData: any = { status: args.status };

    if (args.status === 'resolved') {
      updateData.resolved_at = new Date().toISOString();
    }

    const response = await makeAuthenticatedRequest(`${baseUrl}/api/collections/incidents/records/${args.incident_id}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to update incident: ${error.message || 'Unknown error'}`);
    }

    const updated = await response.json();

    return {
      content: [
        {
          type: 'text',
          text: ` Incident status updated successfully!\n\n=� **Updated Details:**\n- **ID:** ${updated.id}\n- **New Status:** ${updated.status}\n- **Resolved At:** ${updated.resolved_at ? new Date(updated.resolved_at).toLocaleString() : 'N/A'}\n${args.notes ? `\n=� **Notes:** ${args.notes}` : ''}\n\n=� Consider adding a solution or extracting lessons from this incident.`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `L Error updating incident status: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

export async function handleExportKnowledge(args: any) {
  if (!args.format || !['json', 'csv', 'markdown'].includes(args.format)) {
    throw new Error('Format is required and must be one of: json, csv, markdown');
  }

  const baseUrl = config.pocketbase.url;

  try {
    // Build filter
    let filter = '';
    if (args.filter?.category) {
      filter += `category = "${args.filter.category}"`;
    }
    if (args.filter?.status) {
      filter += (filter ? ' && ' : '') + `status = "${args.filter.status}"`;
    }
    if (args.filter?.severity) {
      filter += (filter ? ' && ' : '') + `severity = "${args.filter.severity}"`;
    }

    const url = filter
      ? `${baseUrl}/api/collections/incidents/records?filter=${encodeURIComponent(filter)}&perPage=200`
      : `${baseUrl}/api/collections/incidents/records?perPage=200`;

    const response = await makeAuthenticatedRequest(url);

    if (!response.ok) {
      throw new Error('Failed to export knowledge');
    }

    const data = await response.json();
    const incidents = data.items;

    let exportData: string;

    switch (args.format) {
      case 'json':
        exportData = JSON.stringify(incidents, null, 2);
        break;

      case 'csv':
        const headers = ['ID', 'Title', 'Category', 'Status', 'Severity', 'Description', 'Created'];
        const rows = incidents.map((inc: any) => [
          inc.id,
          inc.title,
          inc.category,
          inc.status,
          inc.severity,
          inc.description.replace(/"/g, '""'), // Escape quotes for CSV
          new Date(inc.created).toLocaleDateString()
        ]);
        exportData = [headers, ...rows].map(row =>
          row.map(cell => `"${cell}"`).join(',')
        ).join('\n');
        break;

      case 'markdown':
        exportData = incidents.map((inc: any) =>
          `## ${inc.title}\n\n` +
          `**Category:** ${inc.category} | **Status:** ${inc.status} | **Severity:** ${inc.severity}\n\n` +
          `**Description:** ${inc.description}\n\n` +
          `${inc.root_cause ? `**Root Cause:** ${inc.root_cause}\n\n` : ''}` +
          `**Created:** ${new Date(inc.created).toLocaleDateString()}\n\n` +
          `---\n`
        ).join('\n');
        break;

      default:
        throw new Error(`Unsupported format: ${args.format}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: `=� Exported ${incidents.length} incidents in ${args.format.toUpperCase()} format:\n\n\`\`\`${args.format}\n${exportData}\n\`\`\`\n\n=� You can save this export to a file for backup or analysis.`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `L Error exporting knowledge: ${error.message}`
        }
      ],
      isError: true
    };
  }
}