import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, Phone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function LiveChatButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen && (
        <Card className="mb-4 w-80 shadow-lg border-ethiopian-gold">
          <CardContent className="p-4">
            <div className="space-y-3">
              <h3 className="font-semibold text-charcoal">Need Help?</h3>
              <p className="text-sm text-gray-600">
                Chat with our gift specialists for personalized recommendations
              </p>
              <div className="space-y-2">
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => window.open('https://wa.me/251911123456', '_blank')}
                >
                  <MessageCircle size={16} className="mr-2" />
                  WhatsApp Support
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full border-ethiopian-gold text-ethiopian-gold hover:bg-ethiopian-gold hover:text-white"
                  onClick={() => window.open('tel:+251911123456')}
                >
                  <Phone size={16} className="mr-2" />
                  Call Us
                </Button>
              </div>
              <p className="text-xs text-gray-500 text-center">
                Available 9 AM - 6 PM EAT
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-ethiopian-gold hover:bg-amber text-white rounded-full w-14 h-14 shadow-lg animate-pulse"
      >
        <MessageCircle size={24} />
      </Button>
    </div>
  );
}