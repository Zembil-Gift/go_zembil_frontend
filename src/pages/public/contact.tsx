import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, MapPin, MessageCircle, Clock } from "lucide-react";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log("Contact form submitted:", formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-deep-forest to-ethiopian-gold text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="font-display text-4xl sm:text-5xl font-bold mb-4">
              Contact Us
            </h1>
            <p className="text-xl opacity-90 max-w-2xl mx-auto">
              We're here to help you connect with your loved ones. Reach out with any questions or concerns.
            </p>
          </motion.div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl text-charcoal">Send us a Message</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                        Name *
                      </label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Your full name"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                        Email *
                      </label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                      Subject *
                    </label>
                    <Input
                      id="subject"
                      name="subject"
                      type="text"
                      required
                      value={formData.subject}
                      onChange={handleChange}
                      placeholder="How can we help you?"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                      Message *
                    </label>
                    <Textarea
                      id="message"
                      name="message"
                      required
                      rows={6}
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Tell us more about your inquiry..."
                    />
                  </div>
                  
                  <Button
                    type="submit"
                    className="w-full bg-ethiopian-gold hover:bg-amber text-white"
                  >
                    Send Message
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* Contact Information */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-8"
          >
            {/* Contact Methods */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-charcoal mb-6">Get in Touch</h2>
              
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-ethiopian-gold/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail className="text-ethiopian-gold" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-charcoal mb-1">Email</h3>
                  <p className="text-gray-600">support@gozembil.com</p>
                  <p className="text-sm text-gray-500 mt-1">We'll respond within 24 hours</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-ethiopian-gold/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Phone className="text-ethiopian-gold" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-charcoal mb-1">Phone</h3>
                  <p className="text-gray-600">+251 11 123 4567</p>
                  <p className="text-sm text-gray-500 mt-1">Monday - Friday, 9 AM - 6 PM EAT</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-ethiopian-gold/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="text-ethiopian-gold" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-charcoal mb-1">Live Chat</h3>
                  <p className="text-gray-600">Available on our website</p>
                  <p className="text-sm text-gray-500 mt-1">Instant support during business hours</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-ethiopian-gold/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="text-ethiopian-gold" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-charcoal mb-1">Address</h3>
                  <p className="text-gray-600">
                    Bole Subcity, Woreda 03<br />
                    Addis Ababa, Ethiopia
                  </p>
                </div>
              </div>
            </div>

            {/* Business Hours */}
            <Card className="bg-deep-forest text-white">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Clock size={24} className="text-ethiopian-gold" />
                  <h3 className="text-xl font-semibold">Business Hours</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Monday - Friday</span>
                    <span>9:00 AM - 6:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Saturday</span>
                    <span>10:00 AM - 4:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sunday</span>
                    <span>Closed</span>
                  </div>
                  <div className="text-xs text-gray-300 mt-3">
                    All times are in East Africa Time (EAT)
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* FAQ Link */}
            <Card className="border-ethiopian-gold/20">
              <CardContent className="p-6 text-center">
                <h3 className="text-lg font-semibold text-charcoal mb-2">
                  Looking for Quick Answers?
                </h3>
                <p className="text-gray-600 mb-4">
                  Check out our frequently asked questions for instant help.
                </p>
                <Button variant="outline" className="border-ethiopian-gold text-ethiopian-gold hover:bg-ethiopian-gold hover:text-white">
                  View FAQ
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>

      
    </div>
  );
}