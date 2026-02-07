import { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Truck, Package, ClipboardCheck } from 'lucide-react';

import AdminDeliveryPersonnel from './AdminDeliveryPersonnel';
import AdminOrderAssignments from './AdminOrderAssignments';
import AdminDeliveryConfirmations from './AdminDeliveryConfirmations';

export default function AdminDelivery() {
  const [activeTab, setActiveTab] = useState('personnel');

  return (
    <AdminLayout 
      title="Delivery Management" 
      description="Manage delivery staff, assignments, and confirmations"
    >
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
            <TabsTrigger value="personnel" className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Delivery Personnel
            </TabsTrigger>
            <TabsTrigger value="assignments" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Order Assignments
            </TabsTrigger>
            <TabsTrigger value="confirmations" className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" />
              Delivery Confirmations
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="personnel" className="mt-6">
            <AdminDeliveryPersonnel />
          </TabsContent>
          
          <TabsContent value="assignments" className="mt-6">
            <AdminOrderAssignments />
          </TabsContent>
          
          <TabsContent value="confirmations" className="mt-6">
            <AdminDeliveryConfirmations />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
