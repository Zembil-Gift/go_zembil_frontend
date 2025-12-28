import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { 
  Layers, 
  Search,
  Plus,
  Edit,
  Loader2,
  Trash2,
} from 'lucide-react';
import { adminService, SubCategoryResponse, CreateSubCategoryRequest } from '@/services/adminService';


const subcategorySchema = z.object({
  name: z.string().min(1, 'Subcategory name is required'),
  slug: z.string().min(1, 'Slug is required'),
  description: z.string().optional(),
  iconName: z.string().optional(),
  categoryId: z.number().min(1, 'Parent category is required'),
  displayOrder: z.number().min(0, 'Display order must be 0 or greater').default(0),
});

type SubcategoryForm = z.infer<typeof subcategorySchema>;

export default function AdminSubcategories() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState<SubCategoryResponse | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<SubcategoryForm>({
    resolver: zodResolver(subcategorySchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      iconName: '',
      categoryId: 0,
      displayOrder: 0,
    },
  });

  // Fetch categories for the dropdown
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => adminService.getCategories(),
  });

  // Fetch all subcategories from all categories
  const { data: allSubcategories = [], isLoading } = useQuery({
    queryKey: ['all-subcategories', categories],
    queryFn: async () => {
      if (categories.length === 0) return [];
      const subcategoriesPromises = categories.map((cat: any) => 
        adminService.getSubCategories(cat.id).catch(() => [])
      );
      const results = await Promise.all(subcategoriesPromises);
      return results.flat();
    },
    enabled: categories.length > 0,
  });

  const createMutation = useMutation({
    mutationFn: (data: SubcategoryForm) => {
      const request: CreateSubCategoryRequest = {
        name: data.name,
        slug: data.slug,
        description: data.description,
        iconName: data.iconName,
        displayOrder: data.displayOrder,
      };
      return adminService.createSubCategory(data.categoryId, request);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-subcategories'] });
      toast({ title: 'Success', description: 'Subcategory created successfully' });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create subcategory',
        variant: 'destructive',
      });
    },
  });


  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateSubCategoryRequest> }) => 
      adminService.updateSubCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-subcategories'] });
      toast({ title: 'Success', description: 'Subcategory updated successfully' });
      setIsDialogOpen(false);
      setEditingSubcategory(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update subcategory',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminService.deleteSubCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-subcategories'] });
      toast({ title: 'Success', description: 'Subcategory deleted successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete subcategory',
        variant: 'destructive',
      });
    },
  });

  const filteredSubcategories = allSubcategories.filter((sub: SubCategoryResponse) => {
    const matchesSearch = sub.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.slug?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategoryId === 'all' || sub.categoryId?.toString() === filterCategoryId;
    return matchesSearch && matchesCategory;
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const getCategoryName = (categoryId: number) => {
    const category = categories.find((c: any) => c.id === categoryId);
    return category?.name || 'Unknown';
  };

  const onSubmit = (data: SubcategoryForm) => {
    if (editingSubcategory) {
      updateMutation.mutate({ 
        id: editingSubcategory.id, 
        data: {
          name: data.name,
          slug: data.slug,
          description: data.description,
          iconName: data.iconName,
          displayOrder: data.displayOrder,
        }
      });
    } else {
      createMutation.mutate(data);
    }
  };

  const openEditDialog = (subcategory: SubCategoryResponse) => {
    setEditingSubcategory(subcategory);
    form.reset({
      name: subcategory.name,
      slug: subcategory.slug,
      description: subcategory.description || '',
      iconName: subcategory.iconName || '',
      categoryId: subcategory.categoryId,
      displayOrder: subcategory.displayOrder || 0,
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingSubcategory(null);
    form.reset({
      name: '',
      slug: '',
      description: '',
      iconName: '',
      categoryId: 0,
      displayOrder: 0,
    });
    setIsDialogOpen(true);
  };


  return (
    <AdminLayout 
      title="Subcategory Management" 
      description="Manage product subcategories within categories"
    >
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search subcategories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterCategoryId} onValueChange={setFilterCategoryId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat: any) => (
              <SelectItem key={cat.id} value={cat.id.toString()}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={openCreateDialog} className="bg-eagle-green text-white hover:bg-viridian-green">
          <Plus className="h-4 w-4 mr-2 text-white" />
          <span className='text-white'>Add Subcategory</span>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-eagle-green">{allSubcategories.length}</div>
            <p className="text-sm text-gray-500">Total Subcategories</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-eagle-green">{categories.length}</div>
            <p className="text-sm text-gray-500">Parent Categories</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-eagle-green">
              {allSubcategories.filter((s: SubCategoryResponse) => s.isFeatured).length}
            </div>
            <p className="text-sm text-gray-500">Featured</p>
          </CardContent>
        </Card>
      </div>

      {/* Subcategories Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-eagle-green" />
            </div>
          ) : filteredSubcategories.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Parent Category</TableHead>
                  <TableHead>Display Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubcategories.map((subcategory: SubCategoryResponse) => (
                  <TableRow key={subcategory.id}>
                    <TableCell>
                      <div className="font-medium text-eagle-green">{subcategory.name}</div>
                      {subcategory.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {subcategory.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-600 font-mono text-sm">
                      {subcategory.slug}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        {getCategoryName(subcategory.categoryId)}
                      </Badge>
                    </TableCell>
                    <TableCell>{subcategory.displayOrder || 0}</TableCell>
                    <TableCell>
                      <Badge className={subcategory.isFeatured ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800'}>
                        {subcategory.isFeatured ? 'Featured' : 'Standard'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => openEditDialog(subcategory)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this subcategory?')) {
                              deleteMutation.mutate(subcategory.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Layers className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No subcategories found</h3>
              <p className="text-gray-500">
                {searchTerm || filterCategoryId !== 'all' 
                  ? 'Try adjusting your filters' 
                  : 'Get started by creating a subcategory'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>


      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingSubcategory ? 'Edit Subcategory' : 'Create Subcategory'}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent Category</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))} 
                      value={field.value?.toString() || ''}
                      disabled={!!editingSubcategory}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select parent category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((cat: any) => (
                          <SelectItem key={cat.id} value={cat.id.toString()}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Subcategory name" 
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          if (!editingSubcategory) {
                            form.setValue('slug', generateSlug(e.target.value));
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input placeholder="subcategory-slug" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Subcategory description..." rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="displayOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Order</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="bg-eagle-green text-white hover:bg-viridian-green"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {editingSubcategory ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
