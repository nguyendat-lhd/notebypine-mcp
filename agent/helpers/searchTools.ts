/**
 * Tool discovery helper using list_tools responses for keyword-based searching
 */

export interface ToolInfo {
  name: string;
  briefDescription: string;
  specPath: string;
  keywords?: string[];
}

export interface SearchResult {
  tool: ToolInfo;
  relevanceScore: number;
  matchedKeywords: string[];
}

export interface SearchOptions {
  includeDescriptions?: boolean;
  includeSpecPaths?: boolean;
  minRelevanceScore?: number;
  maxResults?: number;
}

// Mock tool list - in real implementation, this would come from MCP server
const MOCK_TOOL_LIST: ToolInfo[] = [
  {
    name: 'create_incident',
    briefDescription: 'Create a structured incident record and surface the new PocketBase ID.',
    specPath: 'docs/specs/tools/create_incident.md',
    keywords: ['create', 'incident', 'record', 'new', 'pocketbase', 'id', 'ticket', 'issue']
  },
  {
    name: 'search_incidents',
    briefDescription: 'Search incidents with keyword and enum filters for rapid triage.',
    specPath: 'docs/specs/tools/search_incidents.md',
    keywords: ['search', 'incidents', 'find', 'filter', 'keyword', 'triage', 'query', 'lookup']
  },
  {
    name: 'add_solution',
    briefDescription: 'Attach a solution record with step-by-step remediation details.',
    specPath: 'docs/specs/tools/add_solution.md',
    keywords: ['add', 'solution', 'remediation', 'fix', 'resolve', 'steps', 'attach', 'record']
  },
  {
    name: 'extract_lessons',
    briefDescription: 'Log a lessons-learned entry and update the source incident root cause.',
    specPath: 'docs/specs/tools/extract_lessons.md',
    keywords: ['extract', 'lessons', 'learned', 'root', 'cause', 'analysis', 'retrospective', 'post-mortem']
  },
  {
    name: 'get_similar_incidents',
    briefDescription: 'Suggest incidents with overlapping signals to reuse fixes.',
    specPath: 'docs/specs/tools/get_similar_incidents.md',
    keywords: ['similar', 'incidents', 'related', 'duplicate', 'overlap', 'signals', 'reuse', 'suggestions']
  },
  {
    name: 'update_incident_status',
    briefDescription: 'Move an incident through its lifecycle and record resolution timestamps.',
    specPath: 'docs/specs/tools/update_incident_status.md',
    keywords: ['update', 'status', 'lifecycle', 'state', 'transition', 'resolve', 'close', 'archive']
  },
  {
    name: 'export_knowledge',
    briefDescription: 'Export the knowledge base in JSON, CSV, or Markdown for sharing.',
    specPath: 'docs/specs/tools/export_knowledge.md',
    keywords: ['export', 'knowledge', 'base', 'json', 'csv', 'markdown', 'share', 'download', 'backup']
  }
];

const DEFAULT_SEARCH_OPTIONS: SearchOptions = {
  includeDescriptions: true,
  includeSpecPaths: true,
  minRelevanceScore: 0.1,
  maxResults: 10,
};

/**
 * Calculate relevance score based on keyword matches
 */
function calculateRelevanceScore(
  query: string,
  tool: ToolInfo,
  matchedKeywords: string[]
): number {
  const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 1);

  let score = 0;
  const weights = {
    nameExact: 1.0,
    namePartial: 0.8,
    descriptionMatch: 0.6,
    keywordMatch: 0.4,
    specPathMatch: 0.2
  };

  // Exact name match
  if (tool.name.toLowerCase() === query.toLowerCase()) {
    score += weights.nameExact;
  }

  // Partial name match
  queryWords.forEach(word => {
    if (tool.name.toLowerCase().includes(word)) {
      score += weights.namePartial;
    }
  });

  // Description matches
  if (tool.briefDescription.toLowerCase().includes(query.toLowerCase())) {
    score += weights.descriptionMatch;
  }

  // Keyword matches
  tool.keywords?.forEach(keyword => {
    queryWords.forEach(queryWord => {
      if (keyword.toLowerCase().includes(queryWord)) {
        score += weights.keywordMatch;
        matchedKeywords.push(keyword);
      }
    });
  });

  // Spec path matches
  if (tool.specPath.toLowerCase().includes(query.toLowerCase())) {
    score += weights.specPathMatch;
  }

  return Math.min(score, 1.0); // Cap at 1.0
}

/**
 * Search tools by keywords and description
 */
export function searchTools(
  query: string,
  options: SearchOptions = {}
): SearchResult[] {
  const opts = { ...DEFAULT_SEARCH_OPTIONS, ...options };
  const queryLower = query.toLowerCase().trim();

  if (!queryLower) {
    return [];
  }

  const results: SearchResult[] = [];

  for (const tool of MOCK_TOOL_LIST) {
    const matchedKeywords: string[] = [];
    const relevanceScore = calculateRelevanceScore(queryLower, tool, matchedKeywords);

    if (relevanceScore >= opts.minRelevanceScore!) {
      results.push({
        tool,
        relevanceScore,
        matchedKeywords: [...new Set(matchedKeywords)] // Remove duplicates
      });
    }
  }

  // Sort by relevance score (highest first)
  results.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Limit results
  return results.slice(0, opts.maxResults);
}

/**
 * Get tools by category/type
 */
export function getToolsByCategory(category: string): ToolInfo[] {
  const categoryLower = category.toLowerCase();

  const categories: Record<string, string[]> = {
    'incident': ['create_incident', 'search_incidents', 'get_similar_incidents', 'update_incident_status'],
    'solution': ['add_solution'],
    'analysis': ['extract_lessons', 'get_similar_incidents'],
    'export': ['export_knowledge'],
    'search': ['search_incidents', 'get_similar_incidents'],
    'management': ['create_incident', 'update_incident_status', 'add_solution']
  };

  const toolNames = categories[categoryLower] || [];
  return MOCK_TOOL_LIST.filter(tool => toolNames.includes(tool.name));
}

/**
 * Get tool by exact name
 */
export function getToolByName(name: string): ToolInfo | undefined {
  return MOCK_TOOL_LIST.find(tool => tool.name.toLowerCase() === name.toLowerCase());
}

/**
 * Get all available tools
 */
export function getAllTools(): ToolInfo[] {
  return [...MOCK_TOOL_LIST];
}

/**
 * Get tools with specific functionality
 */
export function getToolsByFunction(functionality: string): ToolInfo[] {
  const functionalityLower = functionality.toLowerCase();

  const functions: Record<string, string[]> = {
    'create': ['create_incident'],
    'search': ['search_incidents', 'get_similar_incidents'],
    'update': ['update_incident_status', 'add_solution'],
    'analyze': ['extract_lessons'],
    'export': ['export_knowledge'],
    'resolve': ['add_solution', 'update_incident_status'],
    'investigate': ['search_incidents', 'get_similar_incidents', 'extract_lessons']
  };

  const toolNames = functions[functionalityLower] || [];
  return MOCK_TOOL_LIST.filter(tool => toolNames.includes(tool.name));
}

/**
 * Get suggested tools based on common workflows
 */
export function getWorkflowSuggestions(workflow: string): ToolInfo[] {
  const workflows: Record<string, string[]> = {
    'incident_response': ['create_incident', 'search_incidents', 'add_solution', 'extract_lessons'],
    'knowledge_management': ['export_knowledge', 'search_incidents', 'extract_lessons'],
    'triage': ['search_incidents', 'get_similar_incidents', 'create_incident'],
    'resolution': ['add_solution', 'update_incident_status', 'extract_lessons'],
    'analysis': ['get_similar_incidents', 'extract_lessons', 'search_incidents']
  };

  const toolNames = workflows[workflow.toLowerCase()] || [];
  return MOCK_TOOL_LIST.filter(tool => toolNames.includes(tool.name));
}

/**
 * Format search results for display
 */
export function formatSearchResults(results: SearchResult[]): string {
  if (results.length === 0) {
    return 'No tools found matching your query.';
  }

  let output = `Found ${results.length} tool(s):\n\n`;

  results.forEach((result, index) => {
    const { tool, relevanceScore, matchedKeywords } = result;

    output += `${index + 1}. **${tool.name}** (relevance: ${(relevanceScore * 100).toFixed(1)}%)\n`;
    output += `   ${tool.briefDescription}\n`;

    if (matchedKeywords.length > 0) {
      output += `   Matched keywords: ${matchedKeywords.join(', ')}\n`;
    }

    output += `   Spec: ${tool.specPath}\n\n`;
  });

  return output;
}

/**
 * Interactive tool finder
 */
export function findToolsForTask(taskDescription: string): {
  primaryTools: ToolInfo[];
  secondaryTools: ToolInfo[];
  reasoning: string;
} {
  const taskLower = taskDescription.toLowerCase();

  // Analyze task description to determine intent
  let primaryTools: ToolInfo[] = [];
  let secondaryTools: ToolInfo[] = [];
  let reasoning = '';

  // Common task patterns
  if (taskLower.includes('create') && taskLower.includes('incident')) {
    primaryTools = [getToolByName('create_incident')!];
    secondaryTools = [getToolByName('search_incidents')!];
    reasoning = 'Creating a new incident record. You may want to search first to avoid duplicates.';
  }
  else if (taskLower.includes('search') || taskLower.includes('find')) {
    primaryTools = [getToolByName('search_incidents')!];
    if (taskLower.includes('similar') || taskLower.includes('related')) {
      primaryTools.push(getToolByName('get_similar_incidents')!);
    }
    reasoning = 'Searching for existing incidents to find relevant information.';
  }
  else if (taskLower.includes('solution') || taskLower.includes('fix') || taskLower.includes('resolve')) {
    primaryTools = [getToolByName('add_solution')!];
    secondaryTools = [getToolByName('search_incidents')!];
    reasoning = 'Adding a solution to an existing incident. You may need to search for the incident first.';
  }
  else if (taskLower.includes('export') || taskLower.includes('backup') || taskLower.includes('share')) {
    primaryTools = [getToolByName('export_knowledge')!];
    reasoning = 'Exporting knowledge base for sharing or backup.';
  }
  else if (taskLower.includes('analyze') || taskLower.includes('lessons') || taskLower.includes('retrospective')) {
    primaryTools = [getToolByName('extract_lessons')!];
    secondaryTools = [getToolByName('search_incidents')!];
    reasoning = 'Analyzing incidents to extract lessons learned.';
  }
  else {
    // Default: suggest search first
    primaryTools = [getToolByName('search_incidents')!];
    reasoning = 'Starting with search to understand existing incidents before taking action.';
  }

  return {
    primaryTools: primaryTools.filter(Boolean),
    secondaryTools: secondaryTools.filter(Boolean),
    reasoning
  };
}