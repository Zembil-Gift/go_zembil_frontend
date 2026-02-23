import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StateSelect, COUNTRIES } from '@/components/ui/state-select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  MapPin,
  Tag,
  Percent,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Globe
} from 'lucide-react';
import { 
  adminService, 
  TaxZoneDto, 
  TaxCategoryDto, 
  TaxRateDto,
  TaxZoneRequest,
  TaxCategoryRequest,
  TaxRateRequest
} from '@/services/adminService';

export default function AdminTax() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('zones');

  // Zone state
  const [isZoneDialogOpen, setIsZoneDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<TaxZoneDto | null>(null);
  const [zoneForm, setZoneForm] = useState<TaxZoneRequest>({
    code: '',
    name: '',
    country: '',
    state: '',
    city: '',
    description: '',
    active: true,
    priority: 0
  });

  // Category state
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TaxCategoryDto | null>(null);
  const [categoryForm, setCategoryForm] = useState<TaxCategoryRequest>({
    code: '',
    name: '',
    description: '',
    active: true
  });

  // Rate state
  const [isRateDialogOpen, setIsRateDialogOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<TaxRateDto | null>(null);
  const [rateForm, setRateForm] = useState<TaxRateRequest>({
    taxZoneId: 0,
    taxCategoryId: 0,
    rate: 0,
    isCompound: false,
    priority: 1,
    effectiveFrom: new Date().toISOString().split('T')[0],
    effectiveTo: '',
    active: true
  });

  // Queries
  const { data: zones = [], isLoading: zonesLoading } = useQuery({
    queryKey: ['admin', 'tax-zones'],
    queryFn: () => adminService.getTaxZones(),
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['admin', 'tax-categories'],
    queryFn: () => adminService.getTaxCategories(),
  });

  const { data: rates = [], isLoading: ratesLoading } = useQuery({
    queryKey: ['admin', 'tax-rates'],
    queryFn: () => adminService.getTaxRates(),
  });

  // Zone mutations
  const createZoneMutation = useMutation({
    mutationFn: (data: TaxZoneRequest) => adminService.createTaxZone(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tax-zones'] });
      toast({ title: 'Success', description: 'Tax zone created successfully' });
      setIsZoneDialogOpen(false);
      resetZoneForm();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to create tax zone', variant: 'destructive' });
    },
  });

  const updateZoneMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: TaxZoneRequest }) => adminService.updateTaxZone(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tax-zones'] });
      toast({ title: 'Success', description: 'Tax zone updated successfully' });
      setIsZoneDialogOpen(false);
      resetZoneForm();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to update tax zone', variant: 'destructive' });
    },
  });

  const deleteZoneMutation = useMutation({
    mutationFn: (id: number) => adminService.deleteTaxZone(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tax-zones'] });
      toast({ title: 'Success', description: 'Tax zone deleted successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to delete tax zone', variant: 'destructive' });
    },
  });

  // Category mutations
  const createCategoryMutation = useMutation({
    mutationFn: (data: TaxCategoryRequest) => adminService.createTaxCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tax-categories'] });
      toast({ title: 'Success', description: 'Tax category created successfully' });
      setIsCategoryDialogOpen(false);
      resetCategoryForm();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to create tax category', variant: 'destructive' });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: TaxCategoryRequest }) => adminService.updateTaxCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tax-categories'] });
      toast({ title: 'Success', description: 'Tax category updated successfully' });
      setIsCategoryDialogOpen(false);
      resetCategoryForm();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to update tax category', variant: 'destructive' });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: number) => adminService.deleteTaxCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tax-categories'] });
      toast({ title: 'Success', description: 'Tax category deleted successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to delete tax category', variant: 'destructive' });
    },
  });

  // Rate mutations
  const createRateMutation = useMutation({
    mutationFn: (data: TaxRateRequest) => adminService.createTaxRate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tax-rates'] });
      toast({ title: 'Success', description: 'Tax rate created successfully' });
      setIsRateDialogOpen(false);
      resetRateForm();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to create tax rate', variant: 'destructive' });
    },
  });

  const updateRateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: TaxRateRequest }) => adminService.updateTaxRate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tax-rates'] });
      toast({ title: 'Success', description: 'Tax rate updated successfully' });
      setIsRateDialogOpen(false);
      resetRateForm();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to update tax rate', variant: 'destructive' });
    },
  });

  const deleteRateMutation = useMutation({
    mutationFn: (id: number) => adminService.deleteTaxRate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tax-rates'] });
      toast({ title: 'Success', description: 'Tax rate deleted successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to delete tax rate', variant: 'destructive' });
    },
  });

  // Form helpers
  const resetZoneForm = () => {
    setZoneForm({ code: '', name: '', country: '', state: '', city: '', description: '', active: true, priority: 0 });
    setEditingZone(null);
  };

  const resetCategoryForm = () => {
    setCategoryForm({ code: '', name: '', description: '', active: true });
    setEditingCategory(null);
  };

  const resetRateForm = () => {
    setRateForm({
      taxZoneId: 0,
      taxCategoryId: 0,
      rate: 0,
      isCompound: false,
      priority: 1,
      effectiveFrom: new Date().toISOString().split('T')[0],
      effectiveTo: '',
      active: true
    });
    setEditingRate(null);
  };

  const handleEditZone = (zone: TaxZoneDto) => {
    setEditingZone(zone);
    setZoneForm({
      code: zone.code,
      name: zone.name,
      country: zone.country,
      state: zone.state || '',
      city: zone.city || '',
      description: zone.description || '',
      active: zone.active,
      priority: zone.priority
    });
    setIsZoneDialogOpen(true);
  };

  const handleEditCategory = (category: TaxCategoryDto) => {
    setEditingCategory(category);
    setCategoryForm({
      code: category.code,
      name: category.name,
      description: category.description || '',
      active: category.active
    });
    setIsCategoryDialogOpen(true);
  };

  const handleEditRate = (rate: TaxRateDto) => {
    setEditingRate(rate);
    setRateForm({
      taxZoneId: rate.taxZoneId,
      taxCategoryId: rate.taxCategoryId,
      rate: rate.rate,
      isCompound: rate.isCompound || false,
      priority: rate.priority || 1,
      effectiveFrom: rate.effectiveFrom ? new Date(rate.effectiveFrom).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      effectiveTo: rate.effectiveTo ? new Date(rate.effectiveTo).toISOString().split('T')[0] : '',
      active: rate.active
    });
    setIsRateDialogOpen(true);
  };

  const handleSubmitZone = () => {
    if (editingZone) {
      updateZoneMutation.mutate({ id: editingZone.id, data: zoneForm });
    } else {
      createZoneMutation.mutate(zoneForm);
    }
  };

  const handleSubmitCategory = () => {
    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, data: categoryForm });
    } else {
      createCategoryMutation.mutate(categoryForm);
    }
  };

  const handleSubmitRate = () => {
    // Convert date strings to OffsetDateTime format (ISO 8601 with timezone)
    const formattedData = {
      ...rateForm,
      effectiveFrom: rateForm.effectiveFrom + 'T00:00:00Z',
      effectiveTo: rateForm.effectiveTo ? rateForm.effectiveTo + 'T23:59:59Z' : undefined
    };
    
    if (editingRate) {
      updateRateMutation.mutate({ id: editingRate.id, data: formattedData });
    } else {
      createRateMutation.mutate(formattedData);
    }
  };

  return (
    <AdminLayout 
      title="Tax Management" 
      description="Manage tax zones, categories, and rates"
    >
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <Globe className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-eagle-green">{zones.length}</div>
                <p className="text-sm text-gray-500">Tax Zones</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-purple-500/10">
                <Tag className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-eagle-green">{categories.length}</div>
                <p className="text-sm text-gray-500">Tax Categories</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-green-500/10">
                <Percent className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-eagle-green">{rates.length}</div>
                <p className="text-sm text-gray-500">Tax Rates</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="zones" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Tax Zones
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="rates" className="flex items-center gap-2">
            <Percent className="h-4 w-4" />
            Rates
          </TabsTrigger>
        </TabsList>

        {/* Tax Zones Tab */}
        <TabsContent value="zones">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Tax Zones</CardTitle>
                <CardDescription>Geographic regions for tax calculation</CardDescription>
              </div>
              <Button onClick={() => { resetZoneForm(); setIsZoneDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Zone
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {zonesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-eagle-green" />
                </div>
              ) : zones.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No tax zones configured</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {zones.map((zone) => (
                      <TableRow key={zone.id}>
                        <TableCell className="font-medium">{zone.code}</TableCell>
                        <TableCell>{zone.name}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {zone.country}
                            {zone.state && ` / ${zone.state}`}
                            {zone.city && ` / ${zone.city}`}
                          </div>
                        </TableCell>
                        <TableCell>{zone.priority}</TableCell>
                        <TableCell>
                          <Badge className={zone.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                            {zone.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={() => handleEditZone(zone)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-600" onClick={() => deleteZoneMutation.mutate(zone.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tax Categories Tab */}
        <TabsContent value="categories">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Tax Categories</CardTitle>
                <CardDescription>Product/service categories for tax classification</CardDescription>
              </div>
              <Button onClick={() => { resetCategoryForm(); setIsCategoryDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {categoriesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-eagle-green" />
                </div>
              ) : categories.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Tag className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No tax categories configured</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">{category.code}</TableCell>
                        <TableCell>{category.name}</TableCell>
                        <TableCell className="text-sm text-gray-500">{category.description || '-'}</TableCell>
                        <TableCell>
                          <Badge className={category.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                            {category.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={() => handleEditCategory(category)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-600" onClick={() => deleteCategoryMutation.mutate(category.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tax Rates Tab */}
        <TabsContent value="rates">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Tax Rates</CardTitle>
                <CardDescription>Tax percentages for zone and category combinations</CardDescription>
              </div>
              <Button onClick={() => { resetRateForm(); setIsRateDialogOpen(true); }} disabled={zones.length === 0 || categories.length === 0}>
                <Plus className="h-4 w-4 mr-2" />
                Add Rate
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {ratesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-eagle-green" />
                </div>
              ) : rates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Percent className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No tax rates configured</p>
                  {(zones.length === 0 || categories.length === 0) && (
                    <p className="text-sm mt-2">Create zones and categories first</p>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Zone</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rates.map((rate) => (
                      <TableRow key={rate.id}>
                        <TableCell className="font-medium">{rate.name}</TableCell>
                        <TableCell>{rate.taxZoneName || zones.find(z => z.id === rate.taxZoneId)?.name || '-'}</TableCell>
                        <TableCell>{rate.taxCategoryName || categories.find(c => c.id === rate.taxCategoryId)?.name || '-'}</TableCell>
                        <TableCell>
                          <Badge className="bg-blue-100 text-blue-800">{rate.rate}%</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={rate.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                            {rate.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={() => handleEditRate(rate)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-600" onClick={() => deleteRateMutation.mutate(rate.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Zone Dialog */}
      <Dialog open={isZoneDialogOpen} onOpenChange={(open) => { setIsZoneDialogOpen(open); if (!open) resetZoneForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingZone ? 'Edit Tax Zone' : 'Add Tax Zone'}</DialogTitle>
            <DialogDescription>Configure a geographic tax zone. For US, select a state. For other countries, optionally add a city.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Code</Label>
                <Input value={zoneForm.code} onChange={(e) => setZoneForm({ ...zoneForm, code: e.target.value.toUpperCase() })} placeholder="e.g., US-CA or ET" />
              </div>
              <div>
                <Label>Name</Label>
                <Input value={zoneForm.name} onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })} placeholder="e.g., California or Ethiopia" />
              </div>
            </div>
            <div>
              <Label>Country *</Label>
              <Select 
                value={zoneForm.country} 
                onValueChange={(v) => setZoneForm({ ...zoneForm, country: v, state: '', city: '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country.value} value={country.value}>{country.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">For US, tax is matched by state. For others, by country only.</p>
            </div>
            {zoneForm.country === 'United States' ? (
              <div>
                <Label>State *</Label>
                <StateSelect
                  value={zoneForm.state}
                  onValueChange={(v) => setZoneForm({ ...zoneForm, state: v })}
                />
                <p className="text-xs text-muted-foreground mt-1">US taxes are applied based on state</p>
              </div>
            ) : zoneForm.country ? (
              <div>
                <Label>City (Optional)</Label>
                <Input 
                  value={zoneForm.city} 
                  onChange={(e) => setZoneForm({ ...zoneForm, city: e.target.value })} 
                  placeholder="Leave empty for country-wide tax zone" 
                />
                <p className="text-xs text-muted-foreground mt-1">Non-US taxes are applied based on country</p>
              </div>
            ) : null}
            <div>
              <Label>Description</Label>
              <Textarea value={zoneForm.description} onChange={(e) => setZoneForm({ ...zoneForm, description: e.target.value })} placeholder="Optional description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Priority</Label>
                <Input type="number" value={zoneForm.priority} onChange={(e) => setZoneForm({ ...zoneForm, priority: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch checked={zoneForm.active} onCheckedChange={(checked) => setZoneForm({ ...zoneForm, active: checked })} />
                <Label>Active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsZoneDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitZone} disabled={createZoneMutation.isPending || updateZoneMutation.isPending}>
              {(createZoneMutation.isPending || updateZoneMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingZone ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={(open) => { setIsCategoryDialogOpen(open); if (!open) resetCategoryForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Tax Category' : 'Add Tax Category'}</DialogTitle>
            <DialogDescription>Configure a product/service tax category</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Code</Label>
                <Input value={categoryForm.code} onChange={(e) => setCategoryForm({ ...categoryForm, code: e.target.value })} placeholder="e.g., PHYSICAL_GOODS" />
              </div>
              <div>
                <Label>Name</Label>
                <Input value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} placeholder="e.g., Physical Goods" />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} placeholder="Optional description" />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={categoryForm.active} onCheckedChange={(checked) => setCategoryForm({ ...categoryForm, active: checked })} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitCategory} disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}>
              {(createCategoryMutation.isPending || updateCategoryMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingCategory ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rate Dialog */}
      <Dialog open={isRateDialogOpen} onOpenChange={(open) => { setIsRateDialogOpen(open); if (!open) resetRateForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRate ? 'Edit Tax Rate' : 'Add Tax Rate'}</DialogTitle>
            <DialogDescription>Configure a tax rate for a zone and category</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tax Zone</Label>
                <Select value={String(rateForm.taxZoneId)} onValueChange={(v) => setRateForm({ ...rateForm, taxZoneId: parseInt(v) })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select zone" />
                  </SelectTrigger>
                  <SelectContent>
                    {zones.map((zone) => (
                      <SelectItem key={zone.id} value={String(zone.id)}>{zone.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tax Category</Label>
                <Select value={String(rateForm.taxCategoryId)} onValueChange={(v) => setRateForm({ ...rateForm, taxCategoryId: parseInt(v) })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className={rateForm.isCompound ? "grid grid-cols-2 gap-4" : ""}>
              <div>
                <Label>Rate (%)</Label>
                <Input type="number" step="0.01" value={rateForm.rate} onChange={(e) => setRateForm({ ...rateForm, rate: parseFloat(e.target.value) || 0 })} placeholder="e.g., 15" />
              </div>
              {rateForm.isCompound && (
                <div>
                  <Label>Priority</Label>
                  <Input type="number" value={rateForm.priority} onChange={(e) => setRateForm({ ...rateForm, priority: parseInt(e.target.value) || 1 })} placeholder="e.g., 1" />
                  <p className="text-xs text-gray-500 mt-1">Lower numbers apply first</p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Effective From</Label>
                <Input type="date" value={rateForm.effectiveFrom} onChange={(e) => setRateForm({ ...rateForm, effectiveFrom: e.target.value })} />
              </div>
              <div>
                <Label>Effective To (Optional)</Label>
                <Input type="date" value={rateForm.effectiveTo} onChange={(e) => setRateForm({ ...rateForm, effectiveTo: e.target.value })} placeholder="Leave empty for no end date" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Switch checked={rateForm.active} onCheckedChange={(checked) => setRateForm({ ...rateForm, active: checked })} />
                <Label>Active</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={rateForm.isCompound} onCheckedChange={(checked) => setRateForm({ ...rateForm, isCompound: checked })} />
                <Label>Compound Tax</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitRate} disabled={createRateMutation.isPending || updateRateMutation.isPending || !rateForm.taxZoneId || !rateForm.taxCategoryId}>
              {(createRateMutation.isPending || updateRateMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingRate ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
