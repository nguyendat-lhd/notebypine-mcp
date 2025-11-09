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
import type { Solution } from '@/types';
import { Plus, Search, Edit, Trash2, CheckCircle2, XCircle, BookOpen } from 'lucide-react';

interface SolutionFormData {
  title: string;
  description: string;
  steps: string[];
  category: string;
  tags: string[];
  verified: boolean;
}

const SolutionsPage: FC = () => {
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingSolution, setEditingSolution] = useState<Solution | null>(null);
  const [formData, setFormData] = useState<SolutionFormData>({
    title: '',
    description: '',
    steps: [''],
    category: 'troubleshooting',
    tags: [],
    verified: false,
  });
  const [newStep, setNewStep] = useState('');
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    fetchSolutions();
  }, []);

  const fetchSolutions = async () => {
    try {
      setLoading(true);
      const response = await repositoryService.solutions.findAll({ page: 1, limit: 20 });
      setSolutions(response.items);
    } catch (error) {
      console.error('Failed to fetch solutions:', error);
      setSolutions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSolution) {
        await repositoryService.solutions.update(editingSolution.id, formData);
      } else {
        await repositoryService.solutions.create(formData);
      }

      fetchSolutions();
      setIsCreateDialogOpen(false);
      setEditingSolution(null);
      setFormData({
        title: '',
        description: '',
        steps: [''],
        category: 'troubleshooting',
        tags: [],
        verified: false,
      });
      setNewStep('');
      setNewTag('');
    } catch (error) {
      console.error('Failed to save solution:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      steps: [''],
      category: 'troubleshooting',
      tags: [],
      verified: false,
    });
    setNewStep('');
    setNewTag('');
    setEditingSolution(null);
  };

  const handleEdit = (solution: Solution) => {
    setEditingSolution(solution);
    setFormData({
      title: solution.title,
      description: solution.description,
      steps: solution.steps && solution.steps.length > 0 ? solution.steps : [''],
      category: solution.category || 'troubleshooting',
      tags: solution.tags || [],
      verified: solution.verified || false,
    });
    setIsCreateDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this solution?')) {
      try {
        await repositoryService.solutions.delete(id);
        fetchSolutions();
      } catch (error) {
        console.error('Failed to delete solution:', error);
      }
    }
  };

  const addStep = () => {
    if (newStep.trim()) {
      setFormData({
        ...formData,
        steps: [...formData.steps.filter(s => s.trim()), newStep.trim()],
      });
      setNewStep('');
    }
  };

  const removeStep = (index: number) => {
    setFormData({
      ...formData,
      steps: formData.steps.filter((_, i) => i !== index),
    });
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag.trim()],
      });
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove),
    });
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'troubleshooting':
        return 'default';
      case 'performance':
        return 'secondary';
      case 'configuration':
        return 'outline';
      case 'security':
        return 'destructive';
      case 'deployment':
        return 'default';
      case 'maintenance':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getVerifiedStatusColor = (verified: boolean) => {
    return verified ? 'default' : 'secondary';
  };

  const filteredSolutions = solutions.filter(solution =>
    (solution.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (solution.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (solution.category && solution.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (solution.tags && solution.tags.some(tag => tag && tag.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Solutions Management</h1>
          <p className="text-muted-foreground">
            Manage and organize solution documentation
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open) {
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              New Solution
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingSolution ? 'Edit Solution' : 'Create New Solution'}
              </DialogTitle>
              <DialogDescription>
                {editingSolution
                  ? 'Update the solution details below.'
                  : 'Fill in the details to create a new solution.'
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter solution title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the solution"
                  rows={3}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="troubleshooting">Troubleshooting</SelectItem>
                    <SelectItem value="performance">Performance</SelectItem>
                    <SelectItem value="configuration">Configuration</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="deployment">Deployment</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Steps</Label>
                <div className="space-y-2">
                  {formData.steps.map((step, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
                      <Input
                        value={step}
                        onChange={(e) => {
                          const newSteps = [...formData.steps];
                          newSteps[index] = e.target.value;
                          setFormData({ ...formData, steps: newSteps });
                        }}
                        placeholder={`Step ${index + 1}`}
                        className="flex-1"
                      />
                      {formData.steps.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeStep(index)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <Input
                      value={newStep}
                      onChange={(e) => setNewStep(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addStep();
                        }
                      }}
                      placeholder="Add a new step..."
                      className="flex-1"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={addStep}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:text-destructive"
                      >
                        <XCircle className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    placeholder="Add a tag..."
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addTag}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="verified"
                  checked={formData.verified}
                  onChange={(e) => setFormData({ ...formData, verified: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="verified" className="cursor-pointer">
                  Verified Solution
                </Label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingSolution ? 'Update' : 'Create'} Solution
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Solutions</CardTitle>
          <CardDescription>
            A list of all documented solutions and their details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search solutions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {loading ? (
            <div className="text-center py-8">Loading solutions...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Steps</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSolutions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      No solutions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSolutions.map((solution) => (
                    <TableRow key={solution.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-semibold flex items-center gap-2">
                            {solution.title}
                            {solution.verified && (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground truncate max-w-xs">
                            {solution.description}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getCategoryColor(solution.category || 'troubleshooting')}>
                          {solution.category || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {solution.steps?.length || 0} step{solution.steps?.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {solution.tags?.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {solution.tags && solution.tags.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{solution.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getVerifiedStatusColor(solution.verified)} className="flex items-center w-fit">
                          {solution.verified ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Verified
                            </>
                          ) : (
                            <>
                              <XCircle className="h-4 w-4 mr-1" />
                              Unverified
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const createdAt = solution.created ?? solution.created_at;
                          return createdAt ? new Date(createdAt).toLocaleDateString() : 'Unknown';
                        })()}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(solution)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(solution.id)}
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

export default SolutionsPage;
