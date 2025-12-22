import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Coins, 
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Star,
  Check,
  X
} from 'lucide-react';
import { adminService, CurrencyDto } from '@/services/adminService';

export default function AdminCurrency() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDefaultDialogOpen, setIsDefaultDialogOpen] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<CurrencyDto | null>(null);
  const [deletingCurrency, setDeletingCurrency] = useState<CurrencyDto | null>(null);
  const [changingDefaultCurrency, setChangingDefaultCurrency] = useState<CurrencyDto | null>(null);
  const [currencyForm, setCurrencyForm] = useState({
    code: '',
    name: '',
    symbol: '',
    decimalPlaces: 2,
    isDefault: false,
    isActive: true
  });

  // Query
  const { data: currencies = [], isLoading } = useQuery({
    queryKey: ['admin', 'currencies'],
    queryFn: () => adminService.getAllCurrencies(),
  });

  // Mutations
  const saveCurrencyMutation = useMutation({
    mutationFn: (data: Omit<CurrencyDto, 'createdAt' | 'updatedAt'>) => adminService.saveCurrency(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'currencies'] });
      toast({ title: 'Success', description: editingCurrency ? 'Currency updated successfully' : 'Currency created successfully' });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to save currency', variant: 'destructive' });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ code, isActive }: { code: string; isActive: boolean }) => adminService.updateCurrencyStatus(code, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'currencies'] });
      toast({ title: 'Success', description: 'Currency status updated' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to update status', variant: 'destructive' });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: (code: string) => adminService.setDefaultCurrency(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'currencies'] });
      toast({ title: 'Success', description: 'Default currency updated' });
      setIsDefaultDialogOpen(false);
      setChangingDefaultCurrency(null);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to set default currency', variant: 'destructive' });
    },
  });

  const deleteCurrencyMutation = useMutation({
    mutationFn: (code: string) => adminService.deleteCurrency(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'currencies'] });
      toast({ title: 'Success', description: 'Currency deleted successfully' });
      setIsDeleteDialogOpen(false);
      setDeletingCurrency(null);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to delete currency', variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setCurrencyForm({ code: '', name: '', symbol: '', decimalPlaces: 2, isDefault: false, isActive: true });
    setEditingCurrency(null);
  };

  const handleEdit = (currency: CurrencyDto) => {
    setEditingCurrency(currency);
    setCurrencyForm({
      code: currency.code,
      name: currency.name,
      symbol: currency.symbol,
      decimalPlaces: currency.decimalPlaces,
      isDefault: currency.isDefault,
      isActive: currency.isActive
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (currency: CurrencyDto) => {
    setDeletingCurrency(currency);
    setIsDeleteDialogOpen(true);
  };

  const handleSetDefault = (currency: CurrencyDto) => {
    setChangingDefaultCurrency(currency);
    setIsDefaultDialogOpen(true);
  };

  const handleSubmit = () => {
    saveCurrencyMutation.mutate(currencyForm);
  };

  const activeCurrencies = currencies.filter(c => c.isActive);
  const defaultCurrency = currencies.find(c => c.isDefault);

  return (
    <AdminLayout 
      title="Currency Management" 
      description="Manage supported currencies and exchange rates"
    >
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <Coins className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-gotham-bold text-eagle-green">{currencies.length}</div>
                <p className="text-sm text-gray-500">Total Currencies</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-green-500/10">
                <Check className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <div className="text-2xl font-gotham-bold text-green-600">{activeCurrencies.length}</div>
                <p className="text-sm text-gray-500">Active Currencies</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-amber-500/10">
                <Star className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <div className="text-2xl font-gotham-bold text-amber-600">{defaultCurrency?.code || 'N/A'}</div>
                <p className="text-sm text-gray-500">Default Currency</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Currencies Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Currencies</CardTitle>
            <CardDescription>Configure supported currencies for the marketplace</CardDescription>
          </div>
          <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Currency
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-eagle-green" />
            </div>
          ) : currencies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Coins className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No currencies configured</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Decimals</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currencies.map((currency) => (
                  <TableRow key={currency.code}>
                    <TableCell className="font-medium">{currency.code}</TableCell>
                    <TableCell>{currency.name}</TableCell>
                    <TableCell className="text-lg">{currency.symbol}</TableCell>
                    <TableCell>{currency.decimalPlaces}</TableCell>
                    <TableCell>
                      {currency.isDefault ? (
                        <Badge className="bg-amber-100 text-amber-800">
                          <Star className="h-3 w-3 mr-1 fill-current" />
                          Default
                        </Badge>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => handleSetDefault(currency)}
                          disabled={setDefaultMutation.isPending || !currency.isActive}
                        >
                          Set Default
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={currency.isActive}
                          onCheckedChange={(checked) => updateStatusMutation.mutate({ code: currency.code, isActive: checked })}
                          disabled={currency.isDefault && currency.isActive}
                        />
                        <span className={currency.isActive ? 'text-green-600' : 'text-gray-500'}>
                          {currency.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(currency)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-red-600" 
                          onClick={() => handleDelete(currency)}
                          disabled={currency.isDefault}
                        >
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

      {/* Currency Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCurrency ? 'Edit Currency' : 'Add Currency'}</DialogTitle>
            <DialogDescription>Configure currency settings</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Currency Code</Label>
                <Input 
                  value={currencyForm.code} 
                  onChange={(e) => setCurrencyForm({ ...currencyForm, code: e.target.value.toUpperCase() })} 
                  placeholder="e.g., USD, ETB, EUR"
                  maxLength={3}
                  disabled={!!editingCurrency}
                />
              </div>
              <div>
                <Label>Symbol</Label>
                <Input 
                  value={currencyForm.symbol} 
                  onChange={(e) => setCurrencyForm({ ...currencyForm, symbol: e.target.value })} 
                  placeholder="e.g., $, ብር, €"
                />
              </div>
            </div>
            <div>
              <Label>Name</Label>
              <Input 
                value={currencyForm.name} 
                onChange={(e) => setCurrencyForm({ ...currencyForm, name: e.target.value })} 
                placeholder="e.g., US Dollar, Ethiopian Birr"
              />
            </div>
            <div>
              <Label>Decimal Places</Label>
              <Input 
                type="number" 
                min="0" 
                max="4"
                value={currencyForm.decimalPlaces} 
                onChange={(e) => setCurrencyForm({ ...currencyForm, decimalPlaces: parseInt(e.target.value) || 0 })} 
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch 
                checked={currencyForm.isActive} 
                onCheckedChange={(checked) => setCurrencyForm({ ...currencyForm, isActive: checked })} 
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saveCurrencyMutation.isPending || !currencyForm.code || !currencyForm.name}>
              {saveCurrencyMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingCurrency ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Currency</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deletingCurrency?.name} ({deletingCurrency?.code})?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingCurrency(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deletingCurrency && deleteCurrencyMutation.mutate(deletingCurrency.code)}
            >
              {deleteCurrencyMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDefaultDialogOpen} onOpenChange={setIsDefaultDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              Change Default Currency
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p className="font-medium text-amber-700">
                ⚠️ Warning: This action will affect existing prices in the system.
              </p>
              <p>
                You are about to change the default currency from <strong>{defaultCurrency?.code}</strong> to <strong>{changingDefaultCurrency?.code}</strong>.
              </p>
              <p className="text-sm">
                Changing the default currency may impact how prices are displayed and calculated throughout the marketplace. 
                Please ensure all vendors and customers are aware of this change.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setChangingDefaultCurrency(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 hover:bg-amber-700"
              onClick={() => changingDefaultCurrency && setDefaultMutation.mutate(changingDefaultCurrency.code)}
            >
              {setDefaultMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Change Default Currency
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
