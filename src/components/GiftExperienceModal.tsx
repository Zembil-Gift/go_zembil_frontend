import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MapPin, Clock, Heart, Gift, Send, CalendarDays } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

interface GiftExperienceModalProps {
  experience: {
    id: number;
    name: string;
    description: string;
    ticketPrice?: string;
    basePrice?: string;
    eventDate?: string;
    venue?: string;
    venueAddress?: string;
    location?: { name: string; country: string };
    type: "event" | "service";
  };
  children: React.ReactNode;
}

export default function GiftExperienceModal({ experience, children }: GiftExperienceModalProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    recipientName: "",
    recipientEmail: "",
    recipientPhone: "",
    recipientAddress: "",
    giftMessage: "",
    deliveryMethod: "digital",
    deliveryDate: "",
    ticketQuantity: 1,
    specialRequests: "",
  });
  
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const price = experience.ticketPrice || experience.basePrice || "0";
  const totalAmount = parseFloat(price) * formData.ticketQuantity;

  const createGiftMutation = useMutation({
    mutationFn: async (data: any) => {
      const endpoint = experience.type === "event" ? "/api/event-gift-orders" : "/api/service-gift-orders";
      const payload = {
        ...data,
        [experience.type === "event" ? "eventId" : "serviceId"]: experience.id,
        totalAmount: totalAmount.toFixed(2),
      };
      
      return await apiRequest("POST", endpoint, payload);
    },
    onSuccess: (data) => {
      toast({
        title: "Gift Experience Created! 🎁",
        description: `Your gift has been created with confirmation code: ${data.confirmationCode}`,
      });
      setOpen(false);
      setFormData({
        recipientName: "",
        recipientEmail: "",
        recipientPhone: "",
        recipientAddress: "",
        giftMessage: "",
        deliveryMethod: "digital",
        deliveryDate: "",
        ticketQuantity: 1,
        specialRequests: "",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/event-gift-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/service-gift-orders"] });
    },
    onError: (error) => {
      toast({
        title: "Error Creating Gift",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      toast({
        title: "Please Sign In",
        description: "You need to be signed in to gift experiences.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 1000);
      return;
    }

    if (!formData.recipientName || !formData.recipientEmail) {
      toast({
        title: "Missing Information",
        description: "Please provide recipient name and email.",
        variant: "destructive",
      });
      return;
    }

    createGiftMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-amber-700">
            <Gift className="w-6 h-6" />
            Gift This Experience
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Experience Summary */}
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-amber-800">{experience.name}</CardTitle>
              <CardDescription className="text-amber-700">
                {experience.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-amber-700">
                  <MapPin className="w-4 h-4" />
                  <span>{experience.location?.name || experience.venue}</span>
                </div>
                {experience.eventDate && (
                  <div className="flex items-center gap-2 text-amber-700">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(experience.eventDate).toLocaleDateString()}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-amber-700">
                  <Heart className="w-4 h-4" />
                  <span className="font-semibold">${price} per person</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gift Details Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="recipientName" className="text-amber-800 font-semibold">
                  Recipient Name *
                </Label>
                <Input
                  id="recipientName"
                  value={formData.recipientName}
                  onChange={(e) => setFormData(prev => ({ ...prev, recipientName: e.target.value }))}
                  className="border-amber-300 focus:border-amber-500"
                  placeholder="Who is this gift for?"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="recipientEmail" className="text-amber-800 font-semibold">
                  Recipient Email *
                </Label>
                <Input
                  id="recipientEmail"
                  type="email"
                  value={formData.recipientEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, recipientEmail: e.target.value }))}
                  className="border-amber-300 focus:border-amber-500"
                  placeholder="recipient@example.com"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="recipientPhone" className="text-amber-800 font-semibold">
                  Recipient Phone
                </Label>
                <Input
                  id="recipientPhone"
                  value={formData.recipientPhone}
                  onChange={(e) => setFormData(prev => ({ ...prev, recipientPhone: e.target.value }))}
                  className="border-amber-300 focus:border-amber-500"
                  placeholder="Optional contact number"
                />
              </div>
              
              {experience.type === "event" && (
                <div>
                  <Label htmlFor="ticketQuantity" className="text-amber-800 font-semibold">
                    Number of Tickets
                  </Label>
                  <Select 
                    value={formData.ticketQuantity.toString()} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, ticketQuantity: parseInt(value) }))}
                  >
                    <SelectTrigger className="border-amber-300 focus:border-amber-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                        <SelectItem key={num} value={num.toString()}>
                          {num} {num === 1 ? "ticket" : "tickets"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="recipientAddress" className="text-amber-800 font-semibold">
                Recipient Address
              </Label>
              <Textarea
                id="recipientAddress"
                value={formData.recipientAddress}
                onChange={(e) => setFormData(prev => ({ ...prev, recipientAddress: e.target.value }))}
                className="border-amber-300 focus:border-amber-500"
                placeholder="For physical delivery (optional)"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="giftMessage" className="text-amber-800 font-semibold">
                Personal Gift Message
              </Label>
              <Textarea
                id="giftMessage"
                value={formData.giftMessage}
                onChange={(e) => setFormData(prev => ({ ...prev, giftMessage: e.target.value }))}
                className="border-amber-300 focus:border-amber-500"
                placeholder="Add a heartfelt message to make this gift extra special..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="deliveryMethod" className="text-amber-800 font-semibold">
                  Delivery Method
                </Label>
                <Select 
                  value={formData.deliveryMethod} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, deliveryMethod: value }))}
                >
                  <SelectTrigger className="border-amber-300 focus:border-amber-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="digital">Digital Delivery (Email)</SelectItem>
                    <SelectItem value="physical">Physical Card</SelectItem>
                    <SelectItem value="email">Email Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="deliveryDate" className="text-amber-800 font-semibold">
                  Delivery Date
                </Label>
                <Input
                  id="deliveryDate"
                  type="date"
                  value={formData.deliveryDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, deliveryDate: e.target.value }))}
                  className="border-amber-300 focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="specialRequests" className="text-amber-800 font-semibold">
                Special Requests
              </Label>
              <Textarea
                id="specialRequests"
                value={formData.specialRequests}
                onChange={(e) => setFormData(prev => ({ ...prev, specialRequests: e.target.value }))}
                className="border-amber-300 focus:border-amber-500"
                placeholder="Any special arrangements or notes..."
                rows={2}
              />
            </div>

            {/* Gift Summary */}
            <Card className="border-green-200 bg-green-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-green-800 flex items-center gap-2">
                  <Heart className="w-5 h-5" />
                  Gift Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Experience:</span>
                    <span className="font-semibold">{experience.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Recipient:</span>
                    <span className="font-semibold">{formData.recipientName || "Not specified"}</span>
                  </div>
                  {experience.type === "event" && (
                    <div className="flex justify-between">
                      <span>Tickets:</span>
                      <span className="font-semibold">{formData.ticketQuantity}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold text-green-800 border-t pt-2">
                    <span>Total Amount:</span>
                    <span>${totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3 text-lg font-semibold"
              disabled={createGiftMutation.isPending}
            >
              {createGiftMutation.isPending ? (
                "Creating Gift..."
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  Create Gift Experience
                </>
              )}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}