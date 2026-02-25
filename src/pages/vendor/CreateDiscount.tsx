import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { getCurrencySymbol, getCurrencyDecimals } from "@/lib/currency";
import {
  discountService,
  CreateDiscountRequest,
  DiscountType,
  AppliesTo,
} from "@/services/discountService";
import { vendorService, Product } from "@/services/vendorService";
import { categoryService } from "@/services/categoryService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save } from "lucide-react";

const discountSchema = z.object({
  code: z
    .string()
    .min(3, "Code must be at least 3 characters")
    .max(50)
    .transform(val => val.toUpperCase())
    .pipe(z.string().regex(/^[A-Z0-9_-]+$/, "Only uppercase letters, numbers, underscores, and hyphens")),
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().max(1000).optional(),
  discountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
  discountPercentage: z.preprocess((val) => val === "" || val === null || (typeof val === "number" && isNaN(val)) ? undefined : val, z.number().min(0.01).max(100).optional().nullable()),
  fixedAmount: z.preprocess((val) => val === "" || val === null || (typeof val === "number" && isNaN(val)) ? undefined : val, z.number().min(0.01).optional().nullable()),
  appliesTo: z.enum(["ORDER_TOTAL", "SPECIFIC_PRODUCTS", "SPECIFIC_CATEGORIES", "SPECIFIC_SERVICES", "SPECIFIC_CUSTOM_ORDER_TEMPLATES"]),
  minOrderAmount: z.preprocess(
    (val) => val === "" || val === null || (typeof val === "number" && isNaN(val)) ? undefined : val,
    z.number().min(0, "Minimum order amount must be 0 or more").optional().nullable()
  ),
  maxDiscountAmount: z.preprocess((val) => val === "" || val === null || (typeof val === "number" && isNaN(val)) ? undefined : val, z.number().min(0).optional().nullable()),
  usageLimit: z.preprocess((val) => val === "" || val === null || (typeof val === "number" && isNaN(val)) ? undefined : val, z.number().min(1).optional().nullable()),
  perUserLimit: z.preprocess((val) => val === "" || val === null || (typeof val === "number" && isNaN(val)) ? undefined : val, z.number().min(1).optional().nullable()),
  validFrom: z.string().optional(),
  validUntil: z.string().optional(),
  productIds: z.array(z.number()).optional(),
  categoryIds: z.array(z.number()).optional(),
  serviceIds: z.array(z.number()).optional(),
  customOrderTemplateIds: z.array(z.number()).optional(),
});

type DiscountFormValues = z.infer<typeof discountSchema>;

// Friendly labels for AppliesTo values
const APPLIES_TO_LABELS: Record<string, string> = {
  ORDER_TOTAL: 'Entire Order',
  SPECIFIC_PRODUCTS: 'Specific Products',
  SPECIFIC_CATEGORIES: 'Specific Categories',
  SPECIFIC_SERVICES: 'Specific Services',
  SPECIFIC_CUSTOM_ORDER_TEMPLATES: 'Specific Custom Order Templates',
};

interface DiscountFormProps {
  defaultValues?: Partial<DiscountFormValues>;
  onSubmit: (data: CreateDiscountRequest) => void;
  isSubmitting: boolean;
  submitLabel: string;
}

export function DiscountForm({ defaultValues, onSubmit, isSubmitting, submitLabel }: DiscountFormProps) {
  const { isAuthenticated, user } = useAuth();
  const isVendor = user?.role?.toUpperCase() === 'VENDOR';

  // Get vendor's preferred currency for input
  const vendorCurrency = user?.preferredCurrencyCode || 'USD';
  const currencySymbol = getCurrencySymbol(vendorCurrency);

  // Fetch allowed appliesTo types based on vendor type
  const { data: allowedAppliesToTypes } = useQuery({
    queryKey: ['vendor', 'discount', 'allowed-applies-to'],
    queryFn: () => discountService.getAllowedAppliesToTypes(),
    enabled: isAuthenticated && isVendor,
  });

  // Fetch vendor profile to know vendorType
  const { data: vendorProfile } = useQuery({
    queryKey: ['vendor', 'profile'],
    queryFn: () => vendorService.getMyProfile(),
    enabled: isAuthenticated && isVendor,
  });

  const vendorType = vendorProfile?.vendorType;
  const [productSearch, setProductSearch] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
  const [templateSearch, setTemplateSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');

  const [debouncedProductSearch, setDebouncedProductSearch] = useState('');
  const [debouncedServiceSearch, setDebouncedServiceSearch] = useState('');
  const [debouncedTemplateSearch, setDebouncedTemplateSearch] = useState('');
  const [debouncedCategorySearch, setDebouncedCategorySearch] = useState('');

  const hasProductSearch = debouncedProductSearch.trim().length > 0;
  const hasServiceSearch = debouncedServiceSearch.trim().length > 0;
  const hasTemplateSearch = debouncedTemplateSearch.trim().length > 0;
  const hasCategorySearch = debouncedCategorySearch.trim().length > 0;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedProductSearch(productSearch), 300);
    return () => clearTimeout(timer);
  }, [productSearch]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedServiceSearch(serviceSearch), 300);
    return () => clearTimeout(timer);
  }, [serviceSearch]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTemplateSearch(templateSearch), 300);
    return () => clearTimeout(timer);
  }, [templateSearch]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedCategorySearch(categorySearch), 300);
    return () => clearTimeout(timer);
  }, [categorySearch]);

  // Fetch vendor products by search term (PRODUCT or HYBRID vendors)
  const { data: productsData, isFetching: isFetchingProducts } = useQuery({
    queryKey: ['vendor', 'discount-product-search', user?.id, debouncedProductSearch],
    queryFn: () => vendorService.searchMyProducts(Number(user?.id), debouncedProductSearch, 0, 20),
    enabled: isAuthenticated && isVendor && !!user?.id && (vendorType === 'PRODUCT' || vendorType === 'HYBRID') && hasProductSearch,
  });

  // Fetch vendor services by search term (SERVICE or HYBRID vendors)
  const { data: servicesData, isFetching: isFetchingServices } = useQuery({
    queryKey: ['vendor', 'discount-service-search', debouncedServiceSearch],
    queryFn: async () => {
      const { serviceService } = await import('@/services/serviceService');
      return serviceService.getMyServices(undefined, 0, 20, debouncedServiceSearch);
    },
    enabled: isAuthenticated && isVendor && (vendorType === 'SERVICE' || vendorType === 'HYBRID') && hasServiceSearch,
  });

  // Fetch vendor custom order templates by search term (PRODUCT or HYBRID vendors)
  const { data: templatesData, isFetching: isFetchingTemplates } = useQuery({
    queryKey: ['vendor', 'discount-template-search', vendorProfile?.id, debouncedTemplateSearch],
    queryFn: async () => {
      const { default: customOrderTemplateService } = await import('@/services/customOrderTemplateService');
      if (!vendorProfile?.id) return { content: [] };
      return customOrderTemplateService.getByVendor(vendorProfile.id, 0, 20, undefined, debouncedTemplateSearch);
    },
    enabled: isAuthenticated && isVendor && !!vendorProfile?.id && (vendorType === 'PRODUCT' || vendorType === 'HYBRID') && hasTemplateSearch,
  });

  // Fetch categories by search term
  const { data: categories, isFetching: isFetchingCategories } = useQuery({
    queryKey: ['categories', 'discount-search', debouncedCategorySearch],
    queryFn: () => categoryService.searchCategories(debouncedCategorySearch),
    enabled: isAuthenticated && isVendor && hasCategorySearch,
  });

  const products: Product[] = productsData?.content || [];
  const services = servicesData?.content || [];
  const templates = templatesData?.content || [];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DiscountFormValues>({
    resolver: zodResolver(discountSchema),
    defaultValues: {
      code: '',
      name: '',
      description: '',
      discountType: 'PERCENTAGE',
      discountPercentage: null,
      fixedAmount: null,
      appliesTo: 'ORDER_TOTAL',
      minOrderAmount: null,
      maxDiscountAmount: null,
      usageLimit: null,
      perUserLimit: null,
      validFrom: '',
      validUntil: '',
      productIds: [],
      categoryIds: [],
      serviceIds: [],
      customOrderTemplateIds: [],
      ...defaultValues,
    },
  });

  const discountType = watch('discountType');
  const appliesTo = watch('appliesTo');
  const selectedProductIds = watch('productIds') || [];
  const selectedCategoryIds = watch('categoryIds') || [];
  const selectedServiceIds = watch('serviceIds') || [];
  const selectedTemplateIds = watch('customOrderTemplateIds') || [];

  const handleFormSubmit = (data: DiscountFormValues) => {
    // Convert major units to minor units using vendor currency
    const decimals = getCurrencyDecimals(vendorCurrency);
    const multiplier = Math.pow(10, decimals);
    
    const request: CreateDiscountRequest = {
      code: data.code.toUpperCase(),
      name: data.name,
      description: data.description || undefined,
      discountType: data.discountType as DiscountType,
      discountPercentage: data.discountType === 'PERCENTAGE' && typeof data.discountPercentage === 'number' ? data.discountPercentage : undefined,
      fixedAmountMinor: data.discountType === 'FIXED_AMOUNT' && typeof data.fixedAmount === 'number' ? Math.round(data.fixedAmount * multiplier) : undefined,
      currencyCode: vendorCurrency,
      appliesTo: data.appliesTo as AppliesTo,
      minOrderAmountMinor: typeof data.minOrderAmount === 'number' ? Math.round(data.minOrderAmount * multiplier) : undefined,
      maxDiscountAmountMinor: typeof data.maxDiscountAmount === 'number' ? Math.round(data.maxDiscountAmount * multiplier) : undefined,
      usageLimit: data.usageLimit ?? undefined,
      perUserLimit: data.perUserLimit ?? undefined,
      validFrom: data.validFrom ? new Date(data.validFrom).toISOString() : undefined,
      validUntil: data.validUntil ? new Date(data.validUntil).toISOString() : undefined,
      productIds: data.appliesTo === 'SPECIFIC_PRODUCTS' ? data.productIds : undefined,
      categoryIds: data.appliesTo === 'SPECIFIC_CATEGORIES' ? data.categoryIds : undefined,
      serviceIds: data.appliesTo === 'SPECIFIC_SERVICES' ? data.serviceIds : undefined,
      customOrderTemplateIds: data.appliesTo === 'SPECIFIC_CUSTOM_ORDER_TEMPLATES' ? data.customOrderTemplateIds : undefined,
    };
    onSubmit(request);
  };

  const toggleProductId = (productId: number) => {
    const current = selectedProductIds;
    if (current.includes(productId)) {
      setValue('productIds', current.filter((id) => id !== productId));
    } else {
      setValue('productIds', [...current, productId]);
    }
  };

  const toggleCategoryId = (categoryId: number) => {
    const current = selectedCategoryIds;
    if (current.includes(categoryId)) {
      setValue('categoryIds', current.filter((id) => id !== categoryId));
    } else {
      setValue('categoryIds', [...current, categoryId]);
    }
  };

  const toggleServiceId = (serviceId: number) => {
    const current = selectedServiceIds;
    if (current.includes(serviceId)) {
      setValue('serviceIds', current.filter((id) => id !== serviceId));
    } else {
      setValue('serviceIds', [...current, serviceId]);
    }
  };

  const toggleTemplateId = (templateId: number) => {
    const current = selectedTemplateIds;
    if (current.includes(templateId)) {
      setValue('customOrderTemplateIds', current.filter((id) => id !== templateId));
    } else {
      setValue('customOrderTemplateIds', [...current, templateId]);
    }
  };

  const removeSelectedId = (
    field: 'productIds' | 'categoryIds' | 'serviceIds' | 'customOrderTemplateIds',
    id: number
  ) => {
    const current = watch(field) || [];
    setValue(field, current.filter((itemId: number) => itemId !== id));
  };

  const productNameById = new Map(products.map((p) => [p.id, p.name]));
  const categoryNameById = new Map((categories || []).map((c) => [c.id, c.name]));
  const serviceNameById = new Map(services.map((s: any) => [s.id, s.title]));
  const templateNameById = new Map(templates.map((t: any) => [t.id, t.name]));

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Discount Code *</Label>
              <Input
                id="code"
                placeholder="e.g. SUMMER20"
                {...register('code')}
                className="font-mono uppercase"
              />
              {errors.code && (
                <p className="text-xs text-red-600">{errors.code.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Uppercase letters, numbers, underscores, and hyphens only
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Discount Name *</Label>
              <Input
                id="name"
                placeholder="e.g. Summer Sale 20% Off"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-xs text-red-600">{errors.name.message}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe this discount..."
              rows={3}
              {...register('description')}
            />
            {errors.description && (
              <p className="text-xs text-red-600">{errors.description.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Discount Value */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Discount Value</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Discount Type *</Label>
              <Select
                value={discountType}
                onValueChange={(val) => setValue('discountType', val as DiscountType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                  <SelectItem value="FIXED_AMOUNT">Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>


            {discountType === 'PERCENTAGE' ? (
              <div className="space-y-2">
                <Label htmlFor="discountPercentage">Percentage *</Label>
                <div className="relative">
                  <Input
                    id="discountPercentage"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="100"
                    placeholder="e.g. 20"
                    {...register('discountPercentage', { valueAsNumber: true })}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                </div>
                {errors.discountPercentage && (
                  <p className="text-xs text-red-600">{errors.discountPercentage.message}</p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="fixedAmount">Fixed Amount ({vendorCurrency}) *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{currencySymbol}</span>
                  <Input
                    id="fixedAmount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="e.g. 50.00"
                    className="pl-12"
                    {...register('fixedAmount', { valueAsNumber: true })}
                  />
                </div>
                {errors.fixedAmount && (
                  <p className="text-xs text-red-600">{errors.fixedAmount.message}</p>
                )}
                <p className="text-xs text-muted-foreground">Enter amount in {vendorCurrency}.</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxDiscountAmount">Max Discount Cap ({vendorCurrency})</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{currencySymbol}</span>
              <Input
                id="maxDiscountAmount"
                type="number"
                step="0.01"
                min="0"
                placeholder="Optional - max discount amount"
                className="pl-12"
                {...register('maxDiscountAmount', { valueAsNumber: true })}
              />
            </div>
            {errors.maxDiscountAmount && (
              <p className="text-xs text-red-600">{errors.maxDiscountAmount.message}</p>
            )}
            <p className="text-xs text-muted-foreground">Leave empty for no cap. Enter in {vendorCurrency}.</p>
          </div>
        </CardContent>
      </Card>

      {/* Applicability */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Applicability</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Applies To *</Label>
            <Select
              value={appliesTo}
              onValueChange={(val) => setValue('appliesTo', val as AppliesTo)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(allowedAppliesToTypes || ['ORDER_TOTAL']).map((type) => (
                  <SelectItem key={type} value={type}>
                    {APPLIES_TO_LABELS[type] || type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Product selection */}
          {appliesTo === 'SPECIFIC_PRODUCTS' && (
            <div className="space-y-2">
              <Label>Select Products</Label>
              <Input
                placeholder="Search your products..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
              <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                {products.length > 0 ? products.map((product) => (
                  <div key={product.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`product-${product.id}`}
                      checked={selectedProductIds.includes(product.id!)}
                      onCheckedChange={() => toggleProductId(product.id!)}
                    />
                    <label
                      htmlFor={`product-${product.id}`}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {product.name}
                    </label>
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground">
                    {!productSearch.trim()
                      ? 'Start typing to search products'
                      : (isFetchingProducts ? 'Searching products...' : 'No products found')}
                  </p>
                )}
              </div>
              {selectedProductIds.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedProductIds.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => removeSelectedId('productIds', id)}
                      className="text-xs px-2 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    >
                      {(productNameById.get(id) || `Product #${id}`)} ×
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Category selection */}
          {appliesTo === 'SPECIFIC_CATEGORIES' && (
            <div className="space-y-2">
              <Label>Select Categories</Label>
              <Input
                placeholder="Search categories..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
              />
              <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                {(categories && categories.length > 0) ? categories.map((category) => (
                  <div key={category.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`category-${category.id}`}
                      checked={selectedCategoryIds.includes(category.id)}
                      onCheckedChange={() => toggleCategoryId(category.id)}
                    />
                    <label
                      htmlFor={`category-${category.id}`}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {category.name}
                    </label>
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground">
                    {!categorySearch.trim()
                      ? 'Start typing to search categories'
                      : (isFetchingCategories ? 'Searching categories...' : 'No categories found')}
                  </p>
                )}
              </div>
              {selectedCategoryIds.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedCategoryIds.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => removeSelectedId('categoryIds', id)}
                      className="text-xs px-2 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    >
                      {(categoryNameById.get(id) || `Category #${id}`)} ×
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Service selection */}
          {appliesTo === 'SPECIFIC_SERVICES' && (
            <div className="space-y-2">
              <Label>Select Services</Label>
              <Input
                placeholder="Search your services..."
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
              />
              <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                {services.length > 0 ? services.map((service: any) => (
                  <div key={service.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`service-${service.id}`}
                      checked={selectedServiceIds.includes(service.id)}
                      onCheckedChange={() => toggleServiceId(service.id)}
                    />
                    <label
                      htmlFor={`service-${service.id}`}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {service.title}
                    </label>
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground">
                    {!serviceSearch.trim()
                      ? 'Start typing to search services'
                      : (isFetchingServices ? 'Searching services...' : 'No services found')}
                  </p>
                )}
              </div>
              {selectedServiceIds.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedServiceIds.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => removeSelectedId('serviceIds', id)}
                      className="text-xs px-2 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    >
                      {(serviceNameById.get(id) || `Service #${id}`)} ×
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Custom order template selection */}
          {appliesTo === 'SPECIFIC_CUSTOM_ORDER_TEMPLATES' && (
            <div className="space-y-2">
              <Label>Select Custom Order Templates</Label>
              <Input
                placeholder="Search your templates..."
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
              />
              <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                {templates.length > 0 ? templates.map((template: any) => (
                  <div key={template.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`template-${template.id}`}
                      checked={selectedTemplateIds.includes(template.id)}
                      onCheckedChange={() => toggleTemplateId(template.id)}
                    />
                    <label
                      htmlFor={`template-${template.id}`}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {template.name}
                    </label>
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground">
                    {!templateSearch.trim()
                      ? 'Start typing to search templates'
                      : (isFetchingTemplates ? 'Searching templates...' : 'No templates found')}
                  </p>
                )}
              </div>
              {selectedTemplateIds.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedTemplateIds.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => removeSelectedId('customOrderTemplateIds', id)}
                      className="text-xs px-2 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    >
                      {(templateNameById.get(id) || `Template #${id}`)} ×
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="minOrderAmount">Minimum Order Amount ({vendorCurrency})</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{currencySymbol}</span>
              <Input
                id="minOrderAmount"
                type="number"
                step="0.01"
                min="0"
                placeholder="Optional - minimum order to qualify"
                className="pl-12"
                {...register('minOrderAmount', { valueAsNumber: true })}
              />
            </div>
            {errors.minOrderAmount && (
              <p className="text-xs text-red-600">{errors.minOrderAmount.message}</p>
            )}
            <p className="text-xs text-muted-foreground">Leave empty for no minimum. Enter in {vendorCurrency}.</p>
          </div>
        </CardContent>
      </Card>

      {/* Usage Limits & Validity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Usage Limits & Validity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="usageLimit">Total Usage Limit</Label>
              <Input
                id="usageLimit"
                type="number"
                min="1"
                placeholder="Optional - total times code can be used"
                {...register('usageLimit', { valueAsNumber: true })}
              />
              {errors.usageLimit && (
                <p className="text-xs text-red-600">{errors.usageLimit.message}</p>
              )}
              <p className="text-xs text-muted-foreground">Leave empty for unlimited</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="perUserLimit">Per User Limit</Label>
              <Input
                id="perUserLimit"
                type="number"
                min="1"
                placeholder="Optional - uses per customer"
                {...register('perUserLimit', { valueAsNumber: true })}
              />
              {errors.perUserLimit && (
                <p className="text-xs text-red-600">{errors.perUserLimit.message}</p>
              )}
              <p className="text-xs text-muted-foreground">Leave empty for unlimited per user</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="validFrom">Valid From</Label>
              <Input
                id="validFrom"
                type="datetime-local"
                {...register('validFrom')}
              />
              <p className="text-xs text-muted-foreground">Leave empty for immediate start</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="validUntil">Valid Until</Label>
              <Input
                id="validUntil"
                type="datetime-local"
                {...register('validUntil')}
              />
              <p className="text-xs text-muted-foreground">Leave empty for no expiry</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => window.history.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          <Save className="h-4 w-4 mr-2" />
          {isSubmitting ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}

export default function CreateDiscount() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: CreateDiscountRequest) => discountService.createDiscount(data),
    onSuccess: () => {
      toast({ title: "Discount created", description: "Your new discount code is now active." });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'discounts'] });
      navigate('/vendor/discounts');
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/vendor/discounts')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-xl font-semibold">Create Discount</h2>
          <p className="text-sm text-muted-foreground">Set up a new discount code for your products, services, or custom orders</p>
        </div>
      </div>

      <DiscountForm
        onSubmit={(data) => createMutation.mutate(data)}
        isSubmitting={createMutation.isPending}
        submitLabel="Create Discount"
      />
    </div>
  );
}
