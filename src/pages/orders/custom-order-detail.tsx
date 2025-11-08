import { Card, CardContent } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Heart, Star, CheckCircle, Clock, ArrowRight, Upload, X, FileImage, 
  ChevronLeft, ChevronRight, ShoppingCart, Plus, Minus, Share2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProtectedRoute from "@/components/protected-route";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MockApiService } from "@/services/mockApiService";

// Customizable gift products data with dynamic customization options
const customizableGifts = [
  {
    id: "custom-portrait",
    name: "Butterfly",
    description: "Engraved butterfly with your name",
    image: "custom-gifts/engraved_1.jpeg",
    images: ["custom-gifts/engraved_1.jpeg", "custom-gifts/engraved_2.jpeg"],
    priceRange: "2,500 ETB",
    category: "art",
    recipient: ["for-her", "for-him", "for-couples"],
    rating: 4.9,
    reviews: 127,
    featured: true,
    deliveryTime: "2-3 weeks",
    customization: {
      needsImage: false,
      needsText: true,
      textFields: [
        { name: "name", label: "Name to Engrave", placeholder: "Enter name", required: true, maxLength: 50 }
      ],
      options: [
        { name: "size", label: "Size", type: "select", required: true, options: ["Small", "Medium", "Large"] },
        { name: "color", label: "Color", type: "select", required: false, options: ["Gold", "Silver", "Rose Gold"] }
      ]
    }
  },
  {
    id: "embroidery",
    name: "Hand-stitched Embroidery",
    description: "Beautiful hand-stitched designs on clothing and accessories",
    image: "custom-gifts/engraved_2.jpeg",
    images: ["custom-gifts/engraved_2.jpeg"],
    priceRange: "1,500 ETB",
    category: "fashion",
    recipient: ["for-her", "for-him"],
    rating: 4.8,
    reviews: 89,
    featured: false,
    deliveryTime: "1-2 weeks",
    customization: {
      needsImage: true,
      needsText: true,
      textFields: [
        { name: "text", label: "Text to Embroider", placeholder: "Enter text", required: true, maxLength: 100 }
      ],
      options: [
        { name: "size", label: "Garment Size", type: "select", required: true, options: ["XS", "S", "M", "L", "XL"] },
        { name: "color", label: "Thread Color", type: "select", required: false, options: ["Red", "Blue", "Green", "Gold"] }
      ]
    }
  },
  {
    id: "wood-crafts",
    name: "Wood Crafts",
    description: "Handcrafted wooden items and decorative pieces",
    image: "custom-gifts/engraved_3.jpeg",
    images: ["custom-gifts/engraved_3.jpeg"],
    priceRange: "3,000 ETB",
    category: "home",
    recipient: ["for-him", "for-couples"],
    rating: 4.7,
    reviews: 156,
    featured: true,
    deliveryTime: "2-4 weeks",
    customization: {
      needsImage: false,
      needsText: true,
      textFields: [
        { name: "message", label: "Custom Message", placeholder: "Enter your message", required: false, maxLength: 200 }
      ],
      options: [
        { name: "woodType", label: "Wood Type", type: "select", required: true, options: ["Oak", "Pine", "Walnut", "Mahogany"] }
      ]
    }
  },
  {
    id: "custom-jewelry",
    name: "Custom Jewelry",
    description: "Personalized accessories and handcrafted jewelry",
    image: "custom-gifts/engraved_4.jpeg",
    images: ["custom-gifts/engraved_4.jpeg"],
    priceRange: "5,000 ETB",
    category: "fashion",
    recipient: ["for-her"],
    rating: 4.9,
    reviews: 203,
    featured: true,
    deliveryTime: "2-3 weeks",
    customization: {
      needsImage: false,
      needsText: true,
      textFields: [
        { name: "inscription", label: "Inscription", placeholder: "Enter text to engrave", required: true, maxLength: 30 }
      ],
      options: [
        { name: "material", label: "Material", type: "select", required: true, options: ["Silver", "Gold", "Rose Gold"] },
        { name: "size", label: "Size", type: "select", required: true, options: ["Small", "Medium", "Large"] }
      ]
    }
  },
  {
    id: "painted-ceramics",
    name: "Painted Ceramics",
    description: "Artistic pottery and ceramic pieces",
    image: "custom-gifts/engraved_5.jpeg",
    images: ["custom-gifts/engraved_5.jpeg"],
    priceRange: "2,000 ETB",
    category: "home",
    recipient: ["for-her", "for-couples"],
    rating: 4.6,
    reviews: 94,
    featured: false,
    deliveryTime: "3-4 weeks",
    customization: {
      needsImage: true,
      needsText: false,
      textFields: [],
      options: [
        { name: "style", label: "Painting Style", type: "select", required: true, options: ["Traditional", "Modern", "Abstract"] }
      ]
    }
  },
  {
    id: "personalized-baskets",
    name: "Personalized Gift Baskets",
    description: "Custom gift baskets tailored to your recipient",
    image: "custom-gifts/engraved_6.jpeg",
    images: ["custom-gifts/engraved_6.jpeg"],
    priceRange: "3,500 ETB",
    category: "gifts",
    recipient: ["for-her", "for-him", "for-couples"],
    rating: 4.8,
    reviews: 178,
    featured: true,
    deliveryTime: "1-2 weeks",
    customization: {
      needsImage: false,
      needsText: true,
      textFields: [
        { name: "recipientName", label: "Recipient Name", placeholder: "Enter name", required: true, maxLength: 50 },
        { name: "message", label: "Personal Message", placeholder: "Enter message", required: false, maxLength: 200 }
      ],
      options: [
        { name: "theme", label: "Basket Theme", type: "select", required: true, options: ["Romantic", "Birthday", "Thank You", "Congratulations"] }
      ]
    }
  },
  {
    id: "custom-songs",
    name: "Custom Songs",
    description: "Personalized music compositions",
    image: "custom-gifts/engraved_7.jpeg",
    images: ["custom-gifts/engraved_7.jpeg"],
    priceRange: "4,000 ETB",
    category: "entertainment",
    recipient: ["for-her", "for-him", "for-couples"],
    rating: 5.0,
    reviews: 45,
    featured: false,
    deliveryTime: "2-3 weeks",
    customization: {
      needsImage: false,
      needsText: true,
      textFields: [
        { name: "songTitle", label: "Song Title", placeholder: "Enter song title", required: true, maxLength: 100 },
        { name: "lyrics", label: "Lyrics or Story", placeholder: "Tell us about the song", required: true, maxLength: 500 }
      ],
      options: [
        { name: "genre", label: "Music Genre", type: "select", required: true, options: ["Pop", "Jazz", "Traditional", "Rock", "R&B"] }
      ]
    }
  },
  {
    id: "photo-albums",
    name: "Photo Albums",
    description: "Memory collections and custom photo books",
    image: "custom-gifts/engraved_8.jpeg",
    images: ["custom-gifts/engraved_8.jpeg"],
    priceRange: "2,000 ETB",
    category: "gifts",
    recipient: ["for-her", "for-him", "for-couples"],
    rating: 4.7,
    reviews: 112,
    featured: false,
    deliveryTime: "1-2 weeks",
    customization: {
      needsImage: true,
      needsText: true,
      textFields: [
        { name: "title", label: "Album Title", placeholder: "Enter album title", required: true, maxLength: 50 }
      ],
      options: [
        { name: "size", label: "Album Size", type: "select", required: true, options: ["Small (20 pages)", "Medium (40 pages)", "Large (60 pages)"] }
      ]
    }
  },
  {
    id: "love-letters",
    name: "Love Letters",
    description: "Handwritten personalized messages",
    image: "custom-gifts/engraved_9.jpeg",
    images: ["custom-gifts/engraved_9.jpeg"],
    priceRange: "1,000 ETB",
    category: "gifts",
    recipient: ["for-her", "for-him", "for-couples"],
    rating: 4.9,
    reviews: 267,
    featured: true,
    deliveryTime: "1 week",
    customization: {
      needsImage: false,
      needsText: true,
      textFields: [
        { name: "letterContent", label: "Letter Content", placeholder: "Write your letter", required: true, maxLength: 1000, type: "textarea" }
      ],
      options: [
        { name: "paperType", label: "Paper Type", type: "select", required: true, options: ["Premium", "Vintage", "Elegant"] }
      ]
    }
  },
  {
    id: "leather-goods",
    name: "Leather Goods",
    description: "Handcrafted leather accessories",
    image: "custom-gifts/engraved_10.jpeg",
    images: ["custom-gifts/engraved_10.jpeg"],
    priceRange: "4,000 ETB",
    category: "fashion",
    recipient: ["for-him"],
    rating: 4.8,
    reviews: 134,
    featured: false,
    deliveryTime: "2-3 weeks",
    customization: {
      needsImage: false,
      needsText: true,
      textFields: [
        { name: "initials", label: "Initials", placeholder: "Enter initials", required: true, maxLength: 3 }
      ],
      options: [
        { name: "leatherType", label: "Leather Type", type: "select", required: true, options: ["Genuine Leather", "Premium Leather", "Vintage Leather"] }
      ]
    }
  },
  {
    id: "traditional-crowns",
    name: "Traditional Crowns",
    description: "Cultural headpieces and traditional accessories",
    image: "custom-gifts/mug_1.jpeg",
    images: ["custom-gifts/mug_1.jpeg"],
    priceRange: "6,000 ETB",
    category: "cultural",
    recipient: ["for-her", "for-him"],
    rating: 4.9,
    reviews: 78,
    featured: true,
    deliveryTime: "3-4 weeks",
    customization: {
      needsImage: false,
      needsText: true,
      textFields: [
        { name: "name", label: "Name", placeholder: "Enter name", required: true, maxLength: 50 }
      ],
      options: [
        { name: "size", label: "Crown Size", type: "select", required: true, options: ["Small", "Medium", "Large"] },
        { name: "decoration", label: "Decoration Style", type: "select", required: false, options: ["Simple", "Elaborate", "Royal"] }
      ]
    }
  },
  {
    id: "coffee-accessories",
    name: "Coffee Accessories",
    description: "Brewing essentials and coffee-related gifts",
    image: "custom-gifts/mug_2.jpeg",
    images: ["custom-gifts/mug_2.jpeg", "custom-gifts/mug_3.jpeg"],
    priceRange: "2,500 ETB",
    category: "home",
    recipient: ["for-him", "for-couples"],
    rating: 4.7,
    reviews: 189,
    featured: false,
    deliveryTime: "1-2 weeks",
    customization: {
      needsImage: false,
      needsText: true,
      textFields: [
        { name: "text", label: "Text to Print", placeholder: "Enter text", required: true, maxLength: 50 }
      ],
      options: [
        { name: "size", label: "Mug Size", type: "select", required: true, options: ["Small (250ml)", "Medium (350ml)", "Large (500ml)"] },
        { name: "color", label: "Mug Color", type: "select", required: false, options: ["White", "Black", "Red", "Blue"] }
      ]
    }
  },
];

const createCustomOrderSchema = (product: typeof customizableGifts[0]) => {
  const schema: any = {};

  // Add text fields dynamically
  if (product.customization.textFields) {
    product.customization.textFields.forEach((field) => {
      if (field.required) {
        schema[field.name] = z.string().min(1, `${field.label} is required`).max(field.maxLength || 1000);
      } else {
        schema[field.name] = z.string().max(field.maxLength || 1000).optional();
      }
    });
  }

  // Add option fields dynamically
  if (product.customization.options) {
    product.customization.options.forEach((option) => {
      if (option.required) {
        schema[option.name] = z.string().min(1, `${option.label} is required`);
      } else {
        schema[option.name] = z.string().optional();
      }
    });
  }

  // Add image field if needed
  if (product.customization.needsImage) {
    schema.customImage = z.any().optional();
  }

  return z.object(schema);
};

function CustomOrderDetailContent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [uploadedImage, setUploadedImage] = useState<{ file: File; preview: string } | null>(null);
  const [isWishlisted, setIsWishlisted] = useState(false);

  const product = customizableGifts.find(p => p.id === id);

  if (!product) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-gotham-bold text-eagle-green mb-4">Product Not Found</h1>
          <Button onClick={() => navigate("/custom-orders")} className="bg-eagle-green hover:bg-viridian-green text-white">
            Back to Custom Orders
          </Button>
        </div>
      </div>
    );
  }

  const schema = createCustomOrderSchema(product);
  type CustomOrderForm = z.infer<typeof schema>;

  const form = useForm<CustomOrderForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      ...product.customization.textFields?.reduce((acc, field) => ({ ...acc, [field.name]: "" }), {}),
      ...product.customization.options?.reduce((acc, option) => ({ ...acc, [option.name]: "" }), {}),
    },
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }

      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a JPG or PNG file.",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage({ file, preview: e.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setUploadedImage(null);
  };

  const prevImage = () => {
    setSelectedImageIndex((prev) => (prev === 0 ? product.images.length - 1 : prev - 1));
  };

  const nextImage = () => {
    setSelectedImageIndex((prev) => (prev === product.images.length - 1 ? 0 : prev + 1));
  };

  const customOrderMutation = useMutation({
    mutationFn: async (data: CustomOrderForm) => {
      const backendData = {
        productId: product.id,
        quantity: quantity,
        customization: {
          textFields: product.customization.textFields?.reduce((acc, field) => ({
            ...acc,
            [field.name]: data[field.name as keyof CustomOrderForm]
          }), {}),
          options: product.customization.options?.reduce((acc, option) => ({
            ...acc,
            [option.name]: data[option.name as keyof CustomOrderForm]
          }), {}),
          image: uploadedImage?.file || null,
        },
      };
      
      return await MockApiService.postCustomOrder(backendData);
    },
    onSuccess: () => {
      toast({
        title: "Custom order added to cart!",
        description: "Your personalized gift has been added to your cart.",
        duration: 5000,
      });
      navigate("/cart");
    },
    onError: (error: any) => {
      console.error('Custom order error:', error);
      toast({
        title: "Failed to add to cart",
        description: "Please try again later.",
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  const onSubmit = (data: CustomOrderForm) => {
    customOrderMutation.mutate(data);
  };

  const images = product.images.map(img => `/${img}`);
  const displayImage = uploadedImage?.preview || images[selectedImageIndex];

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-8">
          <Link to="/" className="hover:text-viridian-green">Home</Link>
          <span>/</span>
          <Link to="/custom-orders" className="hover:text-viridian-green">Custom Orders</Link>
          <span>/</span>
          <span className="text-charcoal font-medium">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
          {/* Left: Product Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative aspect-square bg-gray-50 rounded-2xl overflow-hidden shadow-lg">
              <img
                src={displayImage}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              {images.length > 1 && !uploadedImage && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-colors"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-colors"
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail Gallery */}
            {images.length > 1 && !uploadedImage && (
              <div className="flex space-x-2 overflow-x-auto">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                      selectedImageIndex === index
                        ? "border-viridian-green"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Product Info & Customization */}
          <div className="space-y-6">
            {/* Title and Rating */}
            <div>
              <h1 className="font-gotham-bold text-3xl text-eagle-green mb-4">
                {product.name}
              </h1>
              
              <div className="flex items-center space-x-2 mb-4">
                <div className="flex items-center">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={16}
                      className={`${
                        i < Math.floor(product.rating)
                          ? "text-yellow fill-yellow"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-600">
                  {product.rating} ({product.reviews} {product.reviews === 1 ? 'Review' : 'Reviews'})
                </span>
              </div>

              {product.featured && (
                <Badge className="bg-viridian-green text-white font-gotham-bold mb-4">Featured</Badge>
              )}
            </div>

            {/* Price */}
            <div className="text-3xl font-gotham-bold text-eagle-green">
              {product.priceRange}
            </div>

            {/* Customization Form */}
            <Card className="border-eagle-green/20">
              <CardContent className="pt-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Image Upload (if needed) */}
                    {product.customization.needsImage && (
                      <div className="space-y-3">
                        <label className="text-base font-gotham-bold text-eagle-green flex items-center gap-2">
                          <Upload size={18} className="text-viridian-green" />
                          Upload Photo
                        </label>
                        {uploadedImage ? (
                          <div className="relative">
                            <img
                              src={uploadedImage.preview}
                              alt="Uploaded"
                              className="w-full h-64 object-cover rounded-lg border-2 border-eagle-green/20"
                            />
                            <button
                              type="button"
                              onClick={removeImage}
                              className="absolute top-2 right-2 bg-warm-red hover:bg-warm-red/80 text-white rounded-full p-1.5"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-eagle-green/30 rounded-lg p-8 text-center hover:border-viridian-green transition-colors bg-june-bud/5">
                            <Upload size={32} className="mx-auto text-eagle-green/50 mb-4" />
                            <label className="text-sm text-gray-600 mb-2 font-gotham-light cursor-pointer">
                              Drop your image here, or{" "}
                              <span className="text-eagle-green hover:text-viridian-green font-gotham-bold">
                                browse
                                <input
                                  type="file"
                                  className="hidden"
                                  accept=".jpg,.jpeg,.png"
                                  onChange={handleImageUpload}
                                />
                              </span>
                            </label>
                            <p className="text-xs text-gray-400 font-gotham-light mt-2">
                              Supports: JPG, PNG • Max 5MB
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Text Fields */}
                    {product.customization.textFields?.map((field) => (
                      <FormField
                        key={field.name}
                        control={form.control}
                        name={field.name as any}
                        render={({ field: formField }) => (
                          <FormItem>
                            <FormLabel className="text-base font-gotham-bold text-eagle-green">
                              {field.label} {field.required && <span className="text-yellow">*</span>}
                            </FormLabel>
                            <FormControl>
                              {field.type === "textarea" ? (
                                <Textarea
                                  {...formField}
                                  placeholder={field.placeholder}
                                  className="min-h-[120px] border-2 border-eagle-green/20 focus:ring-2 focus:ring-viridian-green resize-none"
                                  maxLength={field.maxLength}
                                />
                              ) : (
                                <Input
                                  {...formField}
                                  placeholder={field.placeholder}
                                  className="h-12 border-2 border-eagle-green/20 focus:ring-2 focus:ring-viridian-green"
                                  maxLength={field.maxLength}
                                />
                              )}
                            </FormControl>
                            <div className="flex justify-between items-center">
                              <p className="text-sm text-gray-500 font-gotham-light">{field.placeholder}</p>
                              <span className="text-xs text-gray-400">
                                {formField.value?.length || 0}/{field.maxLength}
                              </span>
                            </div>
                            <FormMessage className="text-warm-red" />
                          </FormItem>
                        )}
                      />
                    ))}

                    {/* Option Fields (Dropdowns) */}
                    {product.customization.options?.map((option) => (
                      <FormField
                        key={option.name}
                        control={form.control}
                        name={option.name as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-gotham-bold text-eagle-green">
                              {option.label} {option.required && <span className="text-yellow">*</span>}
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-12 border-2 border-eagle-green/20 focus:ring-2 focus:ring-viridian-green">
                                  <SelectValue placeholder="-- Please Select --" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-white border-2 border-eagle-green/20 shadow-xl rounded-lg z-50">
                                {option.options.map((opt) => (
                                  <SelectItem key={opt} value={opt} className="px-4 py-3 hover:bg-viridian-green/10">
                                    {opt}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-warm-red" />
                          </FormItem>
                        )}
                      />
                    ))}

                    {/* Quantity */}
                    <div className="space-y-2">
                      <label className="text-base font-gotham-bold text-eagle-green">Quantity</label>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2 border-2 border-eagle-green/20 rounded-lg">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            className="h-10 w-10 p-0 border-0"
                          >
                            <Minus size={16} />
                          </Button>
                          <span className="text-lg font-gotham-bold w-12 text-center">{quantity}</span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setQuantity(quantity + 1)}
                            className="h-10 w-10 p-0 border-0"
                          >
                            <Plus size={16} />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Add to Basket Button */}
                    <div className="flex items-center gap-4 pt-4">
                      <Button
                        type="submit"
                        disabled={customOrderMutation.isPending}
                        className="flex-1 bg-eagle-green hover:bg-viridian-green text-white h-14 text-lg font-gotham-bold"
                      >
                        {customOrderMutation.isPending ? (
                          <>
                            <Clock size={20} className="animate-spin mr-2" />
                            Adding...
                          </>
                        ) : (
                          <>
                            <ShoppingCart size={20} className="mr-2" />
                            Add To Basket
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-14 w-14 border-eagle-green/30 text-eagle-green hover:bg-eagle-green/10"
                        onClick={() => setIsWishlisted(!isWishlisted)}
                      >
                        <Heart 
                          size={20} 
                          className={isWishlisted ? "fill-red-500 text-red-500" : ""} 
                        />
                      </Button>
                    </div>

                    {/* Delivery Info */}
                    <div className="pt-4 border-t border-eagle-green/10 space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock size={16} />
                        <span>Dispatched within 24 - 48 hours</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock size={16} />
                        <span>Order by 2pm for next day delivery</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckCircle size={16} />
                        <span>Over 2 million happy customers</span>
                      </div>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabs Section */}
        <Tabs defaultValue="description" className="mt-12">
          <TabsList className="bg-white border-b border-eagle-green/10">
            <TabsTrigger value="description" className="font-gotham-bold">Description</TabsTrigger>
            <TabsTrigger value="reviews" className="font-gotham-bold">Reviews</TabsTrigger>
            <TabsTrigger value="delivery" className="font-gotham-bold">Delivery</TabsTrigger>
          </TabsList>
          
          <TabsContent value="description" className="mt-6">
            <Card className="border-eagle-green/10">
              <CardContent className="pt-6">
                <p className="text-gray-700 font-gotham-light leading-relaxed">
                  {product.description}
                </p>
                <p className="text-gray-700 font-gotham-light leading-relaxed mt-4">
                  Wish your loved one a Happy Valentine's Day with this gorgeous, {product.name}. 
                  You can make this truly special with this wonderful gift that your other half will adore.
                </p>
                <button className="text-eagle-green hover:text-viridian-green font-gotham-medium mt-4">
                  Read more...
                </button>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="reviews" className="mt-6">
            <Card className="border-eagle-green/10">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={20}
                        className={`${
                          i < Math.floor(product.rating)
                            ? "text-yellow fill-yellow"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-lg font-gotham-bold text-eagle-green">
                    {product.rating} ({product.reviews} {product.reviews === 1 ? 'Review' : 'Reviews'})
                  </span>
                </div>
                <p className="text-gray-600 font-gotham-light">
                  Customer reviews will appear here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="delivery" className="mt-6">
            <Card className="border-eagle-green/10">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-gotham-bold text-eagle-green mb-2">Delivery Time</h3>
                    <p className="text-gray-600 font-gotham-light">{product.deliveryTime}</p>
                  </div>
                  <div>
                    <h3 className="font-gotham-bold text-eagle-green mb-2">Shipping Information</h3>
                    <p className="text-gray-600 font-gotham-light">
                      We dispatch custom orders within 24-48 hours after confirmation. 
                      Delivery times may vary based on customization complexity.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function CustomOrderDetail() {
  return (
    <ProtectedRoute>
      <CustomOrderDetailContent />
    </ProtectedRoute>
  );
}

