import { useState, useEffect, type FC } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { repositoryService } from '@/services/repository.service';
import type { Incident } from '@/types';
import { Plus, Search, Edit, Trash2, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';

interface IncidentFormData {
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'open' | 'investigating' | 'resolved' | 'closed';
  assigned_to?: string;
}

const IncidentsPage: FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);
  const [formData, setFormData] = useState<IncidentFormData>({
    title: '',
    description: '',
    severity: 'medium',
    status: 'new',
  });

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await repositoryService.incidents.findAll({ page: 1, limit: 20 });
      setIncidents(response.items);
    } catch (error: any) {
      console.error('Failed to fetch incidents:', error);
      const errorMessage = error?.message || 'Failed to fetch incidents. Please ensure PocketBase is running.';
      setError(errorMessage);
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Store editingIncident in a local variable to prevent it from being reset
    const currentEditingIncident = editingIncident;
    
    console.log('Form submit - editingIncident:', currentEditingIncident);
    console.log('Form submit - formData:', formData);
    
    try {
      if (currentEditingIncident && currentEditingIncident.id) {
        console.log('🔄 UPDATE MODE - Updating incident:', currentEditingIncident.id);
        
        // Prepare update data - include all fields from formData
        // Remove undefined values but keep empty strings and other falsy values that are valid
        const updateData: Partial<IncidentFormData> = {
          title: formData.title,
          description: formData.description,
          severity: formData.severity,
          status: formData.status,
        };
        
        // Only include assigned_to if it's defined
        if (formData.assigned_to !== undefined) {
          updateData.assigned_to = formData.assigned_to;
        }
        
        // Remove undefined values
        Object.keys(updateData).forEach(key => {
          if (updateData[key as keyof IncidentFormData] === undefined) {
            delete updateData[key as keyof IncidentFormData];
          }
        });
        
        console.log('Update data (filtered):', updateData);
        
        // Optimistically update the local state first for immediate UI feedback
        setIncidents(prevIncidents =>
          prevIncidents.map(incident =>
            incident.id === currentEditingIncident.id 
              ? { ...incident, ...updateData, updated_at: new Date().toISOString() }
              : incident
          )
        );

        // Then update on server
        const updated = await repositoryService.incidents.update(currentEditingIncident.id, updateData);
        console.log('✅ Update successful:', updated);
        
        // Refresh from server to ensure consistency and get latest data
        await fetchIncidents();
      } else {
        console.log('➕ CREATE MODE - Creating new incident');
        console.log('Create data:', formData);
        
        const created = await repositoryService.incidents.create(formData);
        console.log('✅ Create successful:', created);
        
        // Refresh the list after create
        await fetchIncidents();
      }

      // Close dialog and reset form ONLY after successful operation
      setIsCreateDialogOpen(false);
      setEditingIncident(null);
      setFormData({
        title: '',
        description: '',
        severity: 'medium',
        status: 'new',
      });
    } catch (error) {
      console.error('❌ Failed to save incident:', error);
      // Refresh list to revert optimistic update if it failed
      await fetchIncidents();
      // Keep dialog open on error so user can retry
      // DON'T reset editingIncident here - keep it so user can see what they were editing
    }
  };

  const handleEdit = (incident: Incident) => {
    console.log('📝 Edit clicked for incident:', incident.id, incident);
    setEditingIncident(incident);
    setFormData({
      title: incident.title || '',
      description: incident.description || '',
      severity: (incident.severity || 'medium') as 'low' | 'medium' | 'high' | 'critical',
      status: (incident.status || 'new') as 'new' | 'open' | 'investigating' | 'resolved' | 'closed',
      assigned_to: incident.assigned_to,
    });
    setIsCreateDialogOpen(true);
    console.log('✅ Edit mode activated, editingIncident set to:', incident.id);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this incident?')) {
      try {
        await repositoryService.incidents.delete(id);
        fetchIncidents();
      } catch (error) {
        console.error('Failed to delete incident:', error);
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new':
        return <AlertCircle className="h-4 w-4" />;
      case 'open':
        return <AlertCircle className="h-4 w-4" />;
      case 'investigating':
        return <Clock className="h-4 w-4" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4" />;
      case 'closed':
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'destructive';
      case 'open':
        return 'destructive';
      case 'investigating':
        return 'default';
      case 'resolved':
        return 'secondary';
      case 'closed':
        return 'outline';
      default:
        return 'default';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low':
        return 'secondary';
      case 'medium':
        return 'default';
      case 'high':
        return 'destructive';
      case 'critical':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const filteredIncidents = incidents.filter(incident =>
    incident.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    incident.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Incidents Management</h1>
          <p className="text-muted-foreground">
            Track and manage security incidents
          </p>
        </div>

        <Dialog 
          open={isCreateDialogOpen} 
          onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (!open) {
              // Only reset form and editing state when dialog closes
              // This ensures editingIncident is preserved during the dialog lifecycle
              console.log('Dialog closing, resetting form. Was editing:', editingIncident?.id);
              setEditingIncident(null);
              setFormData({
                title: '',
                description: '',
                severity: 'medium',
                status: 'new',
              });
            } else {
              // Dialog is opening - log what mode we're in
              console.log('Dialog opening. Edit mode:', !!editingIncident, 'Incident ID:', editingIncident?.id);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingIncident(null);
              setFormData({
                title: '',
                description: '',
                severity: 'medium',
                status: 'new',
              });
            }}>
              <Plus className="h-4 w-4 mr-2" />
              New Incident
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingIncident ? `Edit Incident: ${editingIncident.id}` : 'Create New Incident'}
              </DialogTitle>
              <DialogDescription>
                {editingIncident
                  ? `Update the incident details below. (ID: ${editingIncident.id})`
                  : 'Fill in the details to create a new incident.'
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Debug info in development */}
              {process.env.NODE_ENV === 'development' && editingIncident && (
                <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
                  🔍 Debug: Editing incident ID: {editingIncident.id}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter incident title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the incident"
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="severity">Severity</Label>
                  <Select
                    name="severity"
                    value={formData.severity || 'medium'}
                    onValueChange={(value: 'low' | 'medium' | 'high' | 'critical') =>
                      setFormData({ ...formData, severity: value })
                    }
                  >
                    <SelectTrigger id="severity">
                      <SelectValue placeholder="Select severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    name="status"
                    value={formData.status || 'new'}
                    onValueChange={(value: 'new' | 'open' | 'investigating' | 'resolved' | 'closed') =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="investigating">Investigating</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setEditingIncident(null);
                    setFormData({
                      title: '',
                      description: '',
                      severity: 'medium',
                      status: 'new',
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingIncident ? 'Update' : 'Create'} Incident
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Incidents</CardTitle>
          <CardDescription>
            A list of all security incidents and their current status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search incidents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {error && (
            <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="text-sm font-medium text-destructive">Error loading incidents</p>
                  <p className="text-sm text-muted-foreground">{error}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchIncidents}
                  className="ml-auto"
                >
                  Retry
                </Button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">Loading incidents...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIncidents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      No incidents found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredIncidents.map((incident) => (
                    <TableRow key={incident.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-semibold">{incident.title}</div>
                          <div className="text-sm text-muted-foreground truncate max-w-xs">
                            {incident.description}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getSeverityColor(incident.severity)}>
                          {incident.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(incident.status)} className="flex items-center w-fit">
                          {getStatusIcon(incident.status)}
                          <span className="ml-1">{incident.status}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const createdAt = incident.created ?? incident.created_at;
                          return createdAt ? new Date(createdAt).toLocaleDateString() : 'Unknown';
                        })()}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(incident)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(incident.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default IncidentsPage;