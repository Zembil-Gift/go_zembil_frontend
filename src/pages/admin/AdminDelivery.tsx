import { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Truck, Package, ClipboardCheck, Gift, Wallet } from 'lucide-react';

import AdminDeliveryPersonnel from './AdminDeliveryPersonnel';
import AdminOrderAssignments from './AdminOrderAssignments';
import AdminCustomOrderAssignments from './AdminCustomOrderAssignments';
import AdminDeliveryConfirmations from './AdminDeliveryConfirmations';
import AdminDeliveryPayments from './AdminDeliveryPayments';

export default function AdminDelivery() {
  const [activeTab, setActiveTab] = useState('personnel');

  return (
    <AdminLayout 
      title="Delivery Management" 
      description="Manage delivery staff, assignments, and confirmations"
    >
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex flex-wrap gap-1 w-full h-auto p-1 max-w-full">
            <TabsTrigger value="personnel" className="flex items-center gap-2 text-xs sm:text-sm">
              <Truck className="h-4 w-4" />
              <span className="hidden sm:inline">Delivery Personnel</span>
              <span className="sm:hidden">Personnel</span>
            </TabsTrigger>
            <TabsTrigger value="assignments" className="flex items-center gap-2 text-xs sm:text-sm">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Order Assignments</span>
              <span className="sm:hidden">Assignments</span>
            </TabsTrigger>
            <TabsTrigger value="custom-assignments" className="flex items-center gap-2 text-xs sm:text-sm">
              <Gift className="h-4 w-4" />
              <span className="hidden sm:inline">Custom Order Assignments</span>
              <span className="sm:hidden">Custom</span>
            </TabsTrigger>
            <TabsTrigger value="confirmations" className="flex items-center gap-2 text-xs sm:text-sm">
              <ClipboardCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Delivery Confirmations</span>
              <span className="sm:hidden">Confirmations</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2 text-xs sm:text-sm">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">Delivery Payments</span>
              <span className="sm:hidden">Payments</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="personnel" className="mt-6">
            <AdminDeliveryPersonnel />
          </TabsContent>
          
          <TabsContent value="assignments" className="mt-6">
            <AdminOrderAssignments />
          </TabsContent>

          <TabsContent value="custom-assignments" className="mt-6">
            <AdminCustomOrderAssignments />
          </TabsContent>
          
          <TabsContent value="confirmations" className="mt-6">
            <AdminDeliveryConfirmations />
          </TabsContent>

          <TabsContent value="payments" className="mt-6">
            <AdminDeliveryPayments />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
