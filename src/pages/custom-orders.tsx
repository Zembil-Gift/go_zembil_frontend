import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Palette, Camera, Heart, Star, CheckCircle, Clock, ArrowRight, Save, Upload, X, FileImage } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProtectedRoute from "@/components/protected-route";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { MockApiService } from "@/services/mockApiService";

const customOrderSchema = z.object({
  type: z.string().min(1, "Please select an order type"),
  title: z.string().min(3, "Title must be at least 3 characters").max(200, "Title must be less than 200 characters"),
  description: z.string().min(10, "Description must be at least 10 characters").max(2000, "Description must be less than 2000 characters"),
  budget: z.string().min(1, "Please enter your budget"),
  deadline: z.string().min(1, "Please select a deadline"),
  recipientInfo: z.string().max(1000, "Recipient info must be less than 1000 characters").optional(),
  specialRequests: z.string().max(1000, "Special requests must be less than 1000 characters").optional(),
  referenceImage: z.any().optional(),
});

type CustomOrderForm = z.infer<typeof customOrderSchema>;

// Draft management functions
const DRAFT_KEY = 'custom-order-draft';

const saveDraft = (data: Partial<CustomOrderForm>) => {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      ...data,
      savedAt: new Date().toISOString()
    }));
  } catch (error) {
    console.warn('Failed to save draft:', error);
  }
};

const loadDraft = (): Partial<CustomOrderForm> | null => {
  try {
    const stored = localStorage.getItem(DRAFT_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Only load if saved within last 7 days
      const savedAt = new Date(parsed.savedAt);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      if (savedAt > weekAgo) {
        delete parsed.savedAt;
        return parsed;
      }
    }
  } catch (error) {
    console.warn('Failed to load draft:', error);
  }
  return null;
};

const clearDraft = () => {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch (error) {
    console.warn('Failed to clear draft:', error);
  }
};

function CustomOrdersContent() {
  const { toast } = useToast();
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  // Load draft on component mount
  useEffect(() => {
    const draft = loadDraft();
    if (draft && Object.keys(draft).length > 0) {
      setHasDraft(true);
    }
  }, []);

  const form = useForm<CustomOrderForm>({
    resolver: zodResolver(customOrderSchema),
    defaultValues: {
      type: "",
      title: "",
      description: "",
      budget: "",
      deadline: "",
      recipientInfo: "",
      specialRequests: "",
      referenceImage: null,
    },
  });

  // Auto-save draft functionality
  useEffect(() => {
    const subscription = form.watch((value) => {
      // Only save if form has meaningful content
      const hasContent = value.title || value.description || value.type;
      if (hasContent) {
        setIsAutoSaving(true);
        const timeoutId = setTimeout(() => {
          saveDraft(value as Partial<CustomOrderForm>);
          setIsAutoSaving(false);
        }, 1000); // Debounce auto-save by 1 second
        
        return () => clearTimeout(timeoutId);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form]);

  const loadDraftData = () => {
    const draft = loadDraft();
    if (draft) {
      Object.entries(draft).forEach(([key, value]) => {
        if (value) {
          form.setValue(key as keyof CustomOrderForm, value);
        }
      });
      setHasDraft(false);
      toast({
        title: "Draft loaded",
        description: "Your saved draft has been restored.",
      });
    }
  };

  const customOrderMutation = useMutation({
    mutationFn: async (data: CustomOrderForm) => {
      // Map form data to backend schema
      const backendData = {
        title: data.title,
        description: data.description,
        category: data.type,
        budget: parseFloat(data.budget.split('-')[0].replace(/[^0-9.]/g, '')) || null,
        deadline: null, // We could parse this to actual date if needed
        customerNotes: [data.recipientInfo, data.specialRequests].filter(Boolean).join('\n\n'),
      };
      
      return await MockApiService.postCustomOrder(backendData);
    },
    onSuccess: () => {
      setShowSuccessAnimation(true);
      clearDraft(); // Clear saved draft on successful submission
      
      toast({
        title: "Custom order submitted successfully!",
        description: "We'll match you with the perfect artist and get back to you within 24 hours.",
        duration: 5000,
      });
      
      // Reset form after animation
      setTimeout(() => {
        form.reset();
        setShowSuccessAnimation(false);
      }, 3000);
    },
    onError: (error: any) => {
      console.error('Custom order submission error:', error);
      
      let errorMessage = "Please try again later.";
      if (error.message?.includes('401')) {
        errorMessage = "Please sign in to submit a custom order.";
      } else if (error.message?.includes('400')) {
        errorMessage = "Please check your form data and try again.";
      }
      
      toast({
        title: "Submission failed",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  const onSubmit = async (data: CustomOrderForm) => {
    // Validate all required fields are filled
    const requiredFields = ['type', 'title', 'description', 'budget', 'deadline'];
    const missingFields = requiredFields.filter(field => !data[field as keyof CustomOrderForm]);
    
    if (missingFields.length > 0) {
      toast({
        title: "Please fill all required fields",
        description: `Missing: ${missingFields.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    customOrderMutation.mutate(data);
  };

  const orderTypes = [
    { value: "portrait", label: "Custom Portrait", icon: Camera },
    { value: "embroidery", label: "Personalized Embroidery", icon: Heart },
    { value: "art", label: "Epoxy Art Piece", icon: Palette },
    { value: "other", label: "Other Custom Item", icon: Star },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Success Animation Overlay */}
      <AnimatePresence>
        {showSuccessAnimation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", duration: 0.6 }}
                className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <CheckCircle className="text-green-600" size={40} />
              </motion.div>
              <motion.h3
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold text-charcoal mb-2"
              >
                Order Submitted!
              </motion.h3>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-gray-600"
              >
                We'll match you with the perfect artist and get back to you within 24 hours.
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="font-display text-4xl font-bold text-charcoal mb-4">
            Custom Handmade Orders
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Commission unique, personalized pieces from talented Ethiopian artists. Turn your vision into a meaningful gift.
          </p>
        </motion.div>

        {/* Draft Alert */}
        <AnimatePresence>
          {hasDraft && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6"
            >
              <Card className="border-ethiopian-gold/30 bg-ethiopian-gold/5">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Save className="text-ethiopian-gold" size={20} />
                      <div>
                        <h4 className="font-semibold text-charcoal">Draft Found</h4>
                        <p className="text-sm text-gray-600">You have a saved draft from a previous session.</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setHasDraft(false)}
                        className="border-gray-300"
                      >
                        Ignore
                      </Button>
                      <Button
                        size="sm"
                        onClick={loadDraftData}
                        className="bg-ethiopian-gold hover:bg-ethiopian-gold/90"
                      >
                        Load Draft
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-2"
          >
            <Card className="shadow-lg">
              <CardHeader className="relative">
                <CardTitle className="text-2xl text-charcoal">Submit Your Custom Order</CardTitle>
                {isAutoSaving && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute top-6 right-6 flex items-center space-x-2 text-sm text-gray-500"
                  >
                    <Clock size={16} className="animate-spin" />
                    <span>Auto-saving...</span>
                  </motion.div>
                )}
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold text-charcoal">
                            Order Type <span className="text-warm-red">*</span>
                          </FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger 
                                className="h-12 focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
                                aria-describedby="type-description"
                                aria-required="true"
                              >
                                <SelectValue placeholder="Select the type of custom order" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {orderTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  <div className="flex items-center space-x-2">
                                    <type.icon size={16} className="text-ethiopian-gold" />
                                    <span>{type.label}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p id="type-description" className="text-sm text-gray-500">
                            Choose the category that best matches your custom order
                          </p>
                          <FormMessage className="text-warm-red" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold text-charcoal">
                            Project Title <span className="text-warm-red">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="Brief title for your custom order" 
                              className="h-12 focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
                              aria-describedby="title-description"
                              aria-required="true"
                              maxLength={200}
                            />
                          </FormControl>
                          <div className="flex justify-between items-center">
                            <p id="title-description" className="text-sm text-gray-500">
                              A clear, descriptive title for your project
                            </p>
                            <span className="text-xs text-gray-400">
                              {field.value?.length || 0}/200
                            </span>
                          </div>
                          <FormMessage className="text-warm-red" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold text-charcoal">
                            Detailed Description <span className="text-warm-red">*</span>
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Describe your vision in detail. Include colors, style preferences, size requirements, and any specific elements you want included."
                              className="min-h-[120px] focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent resize-none"
                              aria-describedby="description-description"
                              aria-required="true"
                              maxLength={2000}
                            />
                          </FormControl>
                          <div className="flex justify-between items-center">
                            <p id="description-description" className="text-sm text-gray-500">
                              The more details you provide, the better we can match you with the right artist
                            </p>
                            <span className="text-xs text-gray-400">
                              {field.value?.length || 0}/2000
                            </span>
                          </div>
                          <FormMessage className="text-warm-red" />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="budget"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-semibold text-charcoal">
                              Budget Range (ETB) <span className="text-warm-red">*</span>
                            </FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger 
                                  className="h-12 focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
                                  aria-required="true"
                                >
                                  <SelectValue placeholder="Select budget range" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="1000-2500">1,000 - 2,500 ETB (~$7-18)</SelectItem>
                                <SelectItem value="2500-5000">2,500 - 5,000 ETB (~$18-37)</SelectItem>
                                <SelectItem value="5000-10000">5,000 - 10,000 ETB (~$37-74)</SelectItem>
                                <SelectItem value="10000+">10,000+ ETB (~$74+)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-warm-red" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="deadline"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-semibold text-charcoal">
                              Timeline <span className="text-warm-red">*</span>
                            </FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger 
                                  className="h-12 focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
                                  aria-required="true"
                                >
                                  <SelectValue placeholder="When do you need this?" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="1-week">
                                  <div className="flex items-center space-x-2">
                                    <Badge variant="secondary" className="bg-red-100 text-red-700">Rush</Badge>
                                    <span>Within 1 week</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="2-weeks">Within 2 weeks</SelectItem>
                                <SelectItem value="1-month">Within 1 month</SelectItem>
                                <SelectItem value="flexible">
                                  <div className="flex items-center space-x-2">
                                    <Badge variant="secondary" className="bg-green-100 text-green-700">Best Price</Badge>
                                    <span>Flexible timeline</span>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-warm-red" />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="recipientInfo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold text-charcoal">
                            Recipient Information (Optional)
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Tell us about the recipient. Their interests, personality, or the occasion can help artists create something more personal."
                              className="min-h-[80px] focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent resize-none"
                              aria-describedby="recipient-description"
                              maxLength={1000}
                            />
                          </FormControl>
                          <div className="flex justify-between items-center">
                            <p id="recipient-description" className="text-sm text-gray-500">
                              Help us personalize the creation for the recipient
                            </p>
                            <span className="text-xs text-gray-400">
                              {field.value?.length || 0}/1000
                            </span>
                          </div>
                          <FormMessage className="text-warm-red" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="specialRequests"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold text-charcoal">
                            Special Requests (Optional)
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Any additional requirements, shipping instructions, or specific artist preferences."
                              className="min-h-[80px] focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent resize-none"
                              aria-describedby="requests-description"
                              maxLength={1000}
                            />
                          </FormControl>
                          <div className="flex justify-between items-center">
                            <p id="requests-description" className="text-sm text-gray-500">
                              Any specific requirements or preferences for the order
                            </p>
                            <span className="text-xs text-gray-400">
                              {field.value?.length || 0}/1000
                            </span>
                          </div>
                          <FormMessage className="text-warm-red" />
                        </FormItem>
                      )}
                    />

                    {/* File Upload Section */}
                    <div className="space-y-3">
                      <label className="text-base font-semibold text-charcoal block">
                        Upload Reference Image (Optional)
                      </label>
                      <p className="text-sm text-gray-500">
                        You can attach an image or sketch to help us understand your idea better.
                      </p>
                      
                      {/* File Upload Area */}
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-ethiopian-gold transition-colors duration-200">
                        {uploadedFile ? (
                          <div className="space-y-4">
                            {/* File Preview */}
                            {filePreview && (
                              <div className="flex justify-center">
                                <div className="relative">
                                  <img 
                                    src={filePreview} 
                                    alt="Preview" 
                                    className="max-h-32 max-w-32 object-cover rounded-lg border"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setUploadedFile(null);
                                      setFilePreview(null);
                                      form.setValue('referenceImage', null);
                                    }}
                                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-colors"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              </div>
                            )}
                            
                            {/* File Info */}
                            <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                              <FileImage size={16} className="text-ethiopian-gold" />
                              <span>{uploadedFile.name}</span>
                              <span className="text-gray-400">
                                ({(uploadedFile.size / (1024 * 1024)).toFixed(1)} MB)
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <Upload size={24} className="mx-auto text-gray-400" />
                            <div>
                              <p className="text-sm text-gray-600 mb-2">
                                Drop your image here, or{" "}
                                <label className="text-ethiopian-gold hover:text-ethiopian-gold/80 cursor-pointer font-medium">
                                  browse
                                  <input
                                    type="file"
                                    className="hidden"
                                    accept=".jpg,.jpeg,.png,.pdf"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        // Validate file size (5MB max)
                                        if (file.size > 5 * 1024 * 1024) {
                                          toast({
                                            title: "File too large",
                                            description: "Please select a file smaller than 5MB.",
                                            variant: "destructive",
                                          });
                                          return;
                                        }
                                        
                                        // Validate file type
                                        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
                                        if (!allowedTypes.includes(file.type)) {
                                          toast({
                                            title: "Invalid file type",
                                            description: "Please upload a JPG, PNG, or PDF file.",
                                            variant: "destructive",
                                          });
                                          return;
                                        }
                                        
                                        setUploadedFile(file);
                                        form.setValue('referenceImage', file);
                                        
                                        // Create preview for images
                                        if (file.type.startsWith('image/')) {
                                          const reader = new FileReader();
                                          reader.onload = (e) => {
                                            setFilePreview(e.target?.result as string);
                                          };
                                          reader.readAsDataURL(file);
                                        }
                                      }
                                    }}
                                  />
                                </label>
                              </p>
                              <p className="text-xs text-gray-400">
                                Supports: JPG, PNG, PDF • Max 5MB
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="pt-4"
                    >
                      <Button
                        type="submit"
                        disabled={customOrderMutation.isPending}
                        className="w-full bg-ethiopian-gold hover:bg-ethiopian-gold/90 text-white h-14 text-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl focus:ring-4 focus:ring-ethiopian-gold/20"
                        aria-describedby="submit-description"
                      >
                        <div className="flex items-center justify-center space-x-2">
                          {customOrderMutation.isPending ? (
                            <>
                              <Clock size={20} className="animate-spin" />
                              <span>Submitting...</span>
                            </>
                          ) : (
                            <>
                              <span>Submit Custom Order</span>
                              <ArrowRight size={20} />
                            </>
                          )}
                        </div>
                      </Button>
                    </motion.div>
                    <p id="submit-description" className="text-sm text-gray-500 text-center mt-2">
                      By submitting, you agree to our terms and conditions
                    </p>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </motion.div>

          {/* Order Types Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="space-y-6"
          >
            <motion.div
              whileHover={{ y: -2 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="text-xl text-charcoal flex items-center space-x-2">
                    <Palette className="text-ethiopian-gold" size={24} />
                    <span>Order Types</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {orderTypes.map((type, index) => (
                    <motion.div
                      key={type.value}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + index * 0.1 }}
                      className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        className="w-10 h-10 bg-ethiopian-gold/10 rounded-lg flex items-center justify-center flex-shrink-0"
                      >
                        <type.icon className="text-ethiopian-gold" size={20} />
                      </motion.div>
                      <div>
                        <h4 className="font-semibold text-charcoal">{type.label}</h4>
                        <p className="text-sm text-gray-600">
                          {type.value === "portrait" && "Hand-drawn or painted portraits from photos"}
                          {type.value === "embroidery" && "Traditional Ethiopian embroidery with custom text"}
                          {type.value === "art" && "Beautiful epoxy resin art pieces with cultural motifs"}
                          {type.value === "other" && "Any other custom handmade item you can imagine"}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              whileHover={{ y: -2 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="text-xl text-charcoal flex items-center space-x-2">
                    <CheckCircle className="text-ethiopian-gold" size={24} />
                    <span>How It Works</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { step: 1, text: "Submit your custom order request with detailed description" },
                    { step: 2, text: "We match you with the perfect artist within 24 hours" },
                    { step: 3, text: "Artist creates your piece and sends progress updates" },
                    { step: 4, text: "Your custom gift is carefully packaged and delivered" }
                  ].map((item, index) => (
                    <motion.div
                      key={item.step}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.0 + index * 0.1 }}
                      className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        className="w-8 h-8 bg-ethiopian-gold text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                      >
                        {item.step}
                      </motion.div>
                      <p className="text-sm text-gray-600 pt-1">{item.text}</p>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

export default function CustomOrders() {
  return (
    <ProtectedRoute>
      <CustomOrdersContent />
    </ProtectedRoute>
  );
}