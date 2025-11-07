/**
 * Wrapper for get_similar_incidents MCP tool
 */

export interface GetSimilarIncidentsInput {
  incident_id: string;
  limit?: number;
}

export interface SimilarIncident {
  id: string;
  title: string;
  category: string;
  severity: string;
  similarity_score: number;
  matching_signals: string[];
}

export interface GetSimilarIncidentsOutput {
  items: SimilarIncident[];
  total: number;
  query_id: string;
}

/**
 * Get similar incidents based on content analysis
 */
export async function getSimilarIncidents(
  input: GetSimilarIncidentsInput
): Promise<GetSimilarIncidentsOutput> {
  // This would call the actual MCP tool
  // For now, return a mock response that matches the expected structure
  return {
    items: [
      {
        id: 'sample_1',
        title: 'Similar database timeout issue',
        category: 'Backend',
        severity: 'high',
        similarity_score: 0.85,
        matching_signals: ['database', 'timeout', 'connection']
      }
    ],
    total: 1,
    query_id: `similar_${Date.now()}`
  };
}

export type { GetSimilarIncidentsInput, SimilarIncident, GetSimilarIncidentsOutput };