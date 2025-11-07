/**
 * Wrapper for update_incident_status MCP tool
 */

export interface UpdateIncidentStatusInput {
  incident_id: string;
  status: 'open' | 'investigating' | 'resolved' | 'archived';
  notes?: string;
}

export interface UpdateIncidentStatusOutput {
  id: string;
  status: string;
  previous_status: string;
  updated_at: string;
  notes?: string;
}

/**
 * Update incident status through lifecycle
 */
export async function updateIncidentStatus(
  input: UpdateIncidentStatusInput
): Promise<UpdateIncidentStatusOutput> {
  // This would call the actual MCP tool
  // For now, return a mock response that matches the expected structure
  return {
    id: input.incident_id,
    status: input.status,
    previous_status: 'open',
    updated_at: new Date().toISOString(),
    notes: input.notes
  };
}

export type { UpdateIncidentStatusInput, UpdateIncidentStatusOutput };