import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useIncompleteProfile } from "@/hooks/useIncompleteProfile";
import { apiService } from "@/services/apiService";
import { 
  User, 
  Mail, 
  Phone, 
  Calendar,
  Edit2,
  Save,
  X,
  Store,
  ShoppingBag,
  Heart,
  Settings,
  Loader2,
  AlertCircle,
  Coins
} from "lucide-react";

// Profile form schema
const profileSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phoneNumber: z.string().optional(),
  username: z.string().min(3, "Username must be at least 3 characters").optional(),
  birthDate: z.string().optional(),
  preferredCurrencyCode: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface Currency {
  id: number;
  code: string;
  name: string;
  symbol: string;
  isActive: boolean;
  isDefault: boolean;
}

interface UserProfile {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  username?: string;
  phoneNumber?: string;
  role: string;
  birthDate?: string;
  preferredCurrencyCode?: string;
}

export default function Profile() {
  const [isEditing, setIsEditing] = useState(false);
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { isIncomplete, missingFields, isOAuth2User } = useIncompleteProfile();

  const userRole = user?.role?.toUpperCase();
  const isVendor = userRole === 'VENDOR';
  const isAdmin = userRole === 'ADMIN';
  
  // Auto-switch to personal tab if incomplete and coming from navbar
  const defaultTab = searchParams.get('tab') || 'personal';

  // Fetch user profile
  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const response = await apiService.getRequest<UserProfile>('/api/users/me');
      return response;
    },
    enabled: !!user,
  });

  // Fetch available currencies
  const { data: currencies = [] } = useQuery({
    queryKey: ['currencies'],
    queryFn: async () => {
      const response = await apiService.getRequest<Currency[]>('/api/currencies');
      return response;
    },
  });

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      username: "",
      birthDate: "",
      preferredCurrencyCode: "",
    },
  });

  // Update form when profile data is loaded
  useEffect(() => {
    if (profile) {
      form.reset({
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        email: profile.email || "",
        phoneNumber: profile.phoneNumber || "",
        username: profile.username || "",
        birthDate: profile.birthDate || "",
        preferredCurrencyCode: profile.preferredCurrencyCode || "USD",
      });
    }
  }, [profile, form]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const userId = profile?.userId || user?.id;
      return await apiService.putRequest<UserProfile>(`/api/users/${userId}`, data);
    },
    onSuccess: (updatedProfile) => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      
      // Update local storage with new user data
      const currentUser = localStorage.getItem('user');
      if (currentUser) {
        const parsedUser = JSON.parse(currentUser);
        const updatedUser = {
          ...parsedUser,
          firstName: updatedProfile.firstName,
          lastName: updatedProfile.lastName,
          email: updatedProfile.email,
          phoneNumber: updatedProfile.phoneNumber,
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  const handleCancel = () => {
    if (profile) {
      form.reset({
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        email: profile.email || "",
        phoneNumber: profile.phoneNumber || "",
        username: profile.username || "",
        birthDate: profile.birthDate || "",
        preferredCurrencyCode: profile.preferredCurrencyCode || "USD",
      });
    }
    setIsEditing(false);
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.charAt(0)?.toUpperCase() || '';
    const last = lastName?.charAt(0)?.toUpperCase() || '';
    return first + last || 'U';
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role?.toUpperCase()) {
      case 'ADMIN':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'VENDOR':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'DELIVERY_PERSON':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-ethiopian-gold animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-red-500 mb-4">Failed to load profile</p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600 mt-2">Manage your account settings and preferences</p>
        </div>

        {/* Incomplete Profile Alert */}
        {isIncomplete && (
          <Alert className="mb-6 border-amber-300 bg-amber-50">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <AlertTitle className="text-amber-900 font-semibold">Complete Your Profile</AlertTitle>
            <AlertDescription className="text-amber-800">
              {isOAuth2User && (
                <p className="mb-2">
                  You signed up with {user?.email} using social login. To access all features, please add the following information:
                </p>
              )}
              <ul className="list-disc list-inside space-y-1">
                {missingFields.includes('username') && <li>Username (choose a unique username for your profile)</li>}
                {missingFields.includes('phoneNumber') && <li>Phone Number</li>}
                {missingFields.includes('birthDate') && <li>Date of Birth</li>}
                {missingFields.includes('password') && isOAuth2User && <li>Password (to enable standard login)</li>}
              </ul>
              {!isEditing && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3 border-amber-600 text-amber-900 hover:bg-amber-100"
                  onClick={() => setIsEditing(true)}
                >
                  Complete Now
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Profile Summary Card */}
          <Card className="lg:col-span-1">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <Avatar className="w-24 h-24 mb-4 border-4 border-ethiopian-gold/20">
                  <AvatarImage src={user?.profileImageUrl} />
                  <AvatarFallback className="bg-ethiopian-gold text-white text-2xl font-semibold">
                    {getInitials(profile?.firstName, profile?.lastName)}
                  </AvatarFallback>
                </Avatar>
                
                <h2 className="text-xl font-semibold text-gray-900">
                  {profile?.firstName} {profile?.lastName}
                </h2>
                
                <p className="text-gray-500 text-sm mt-1">
                  @{profile?.username || 'username'}
                </p>
                
                <Badge className={`mt-3 ${getRoleBadgeColor(profile?.role || '')}`}>
                  {profile?.role || 'Customer'}
                </Badge>

                <Separator className="my-6 w-full" />

                {/* Quick Links */}
                <div className="w-full space-y-2">
                  <Link to="/wishlist" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 transition-colors">
                    <Heart className="w-5 h-5 text-red-500" />
                    <span className="text-gray-700">Wishlist</span>
                  </Link>
                  
                  <Link to="/my-tickets" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 transition-colors">
                    <ShoppingBag className="w-5 h-5 text-ethiopian-gold" />
                    <span className="text-gray-700">My Tickets</span>
                  </Link>

                  {/* Only show Join as Vendor if user is NOT a vendor */}
                  {!isVendor && !isAdmin && (
                    <Link to="/vendor-signup" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 transition-colors">
                      <Store className="w-5 h-5 text-viridian-green" />
                      <span className="text-gray-700">Join as Vendor</span>
                    </Link>
                  )}

                  {/* Show vendor dashboard link if user IS a vendor */}
                  {isVendor && (
                    <Link to="/vendor" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 transition-colors">
                      <Store className="w-5 h-5 text-viridian-green" />
                      <span className="text-gray-700">Vendor Dashboard</span>
                    </Link>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Details Card */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Update your personal details</CardDescription>
                </div>
                {!isEditing ? (
                  <Button variant="outline" onClick={() => setIsEditing(true)}>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleCancel} disabled={updateProfileMutation.isPending}>
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    <Button onClick={form.handleSubmit(onSubmit)} disabled={updateProfileMutation.isPending}>
                      {updateProfileMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="personal" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="personal">Personal Info</TabsTrigger>
                  <TabsTrigger value="account">Account</TabsTrigger>
                </TabsList>

                <TabsContent value="personal" className="mt-6 space-y-6">
                  <form className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      {/* First Name */}
                      <div className="space-y-2">
                        <Label htmlFor="firstName" className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-500" />
                          First Name
                        </Label>
                        {isEditing ? (
                          <>
                            <Input
                              id="firstName"
                              {...form.register("firstName")}
                              placeholder="Enter your first name"
                            />
                            {form.formState.errors.firstName && (
                              <p className="text-red-500 text-sm">{form.formState.errors.firstName.message}</p>
                            )}
                          </>
                        ) : (
                          <p className="text-gray-900 py-2">{profile?.firstName || '-'}</p>
                        )}
                      </div>

                      {/* Last Name */}
                      <div className="space-y-2">
                        <Label htmlFor="lastName" className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-500" />
                          Last Name
                        </Label>
                        {isEditing ? (
                          <>
                            <Input
                              id="lastName"
                              {...form.register("lastName")}
                              placeholder="Enter your last name"
                            />
                            {form.formState.errors.lastName && (
                              <p className="text-red-500 text-sm">{form.formState.errors.lastName.message}</p>
                            )}
                          </>
                        ) : (
                          <p className="text-gray-900 py-2">{profile?.lastName || '-'}</p>
                        )}
                      </div>
                    </div>

                    {/* Phone Number */}
                    <div className="space-y-2">
                      <Label htmlFor="phoneNumber" className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-500" />
                        Phone Number
                      </Label>
                      {isEditing ? (
                        <Input
                          id="phoneNumber"
                          {...form.register("phoneNumber")}
                          placeholder="Enter your phone number"
                        />
                      ) : (
                        <p className="text-gray-900 py-2">{profile?.phoneNumber || '-'}</p>
                      )}
                    </div>

                    {/* Birth Date */}
                    <div className="space-y-2">
                      <Label htmlFor="birthDate" className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        Birth Date
                      </Label>
                      {isEditing ? (
                        <Input
                          id="birthDate"
                          type="date"
                          {...form.register("birthDate")}
                        />
                      ) : (
                        <p className="text-gray-900 py-2">
                          {profile?.birthDate 
                            ? new Date(profile.birthDate).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })
                            : '-'
                          }
                        </p>
                      )}
                    </div>
                  </form>
                </TabsContent>

                <TabsContent value="account" className="mt-6 space-y-6">
                  <div className="space-y-4">
                    {/* Email */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-500" />
                        Email Address
                      </Label>
                      {isEditing ? (
                        <>
                          <Input
                            {...form.register("email")}
                            placeholder="Enter your email"
                            type="email"
                          />
                          {form.formState.errors.email && (
                            <p className="text-red-500 text-sm">{form.formState.errors.email.message}</p>
                          )}
                        </>
                      ) : (
                        <p className="text-gray-900 py-2">{profile?.email || '-'}</p>
                      )}
                    </div>

                    {/* Username */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />
                        Username
                      </Label>
                      {isEditing ? (
                        <>
                          <Input
                            {...form.register("username")}
                            placeholder="Enter your username"
                          />
                          {form.formState.errors.username && (
                            <p className="text-red-500 text-sm">{form.formState.errors.username.message}</p>
                          )}
                        </>
                      ) : (
                        <p className="text-gray-900 py-2">{profile?.username || '-'}</p>
                      )}
                    </div>

                    {/* Preferred Currency */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Coins className="w-4 h-4 text-gray-500" />
                        Preferred Currency
                      </Label>
                      {isEditing ? (
                        <Select
                          value={form.watch("preferredCurrencyCode")}
                          onValueChange={(value) => form.setValue("preferredCurrencyCode", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                          <SelectContent>
                            {currencies
                              .filter(c => c.isActive)
                              .map((currency) => (
                                <SelectItem key={currency.code} value={currency.code}>
                                  {currency.code} - {currency.name} ({currency.symbol})
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-gray-900 py-2">
                          {currencies.find(c => c.code === profile?.preferredCurrencyCode)?.name || profile?.preferredCurrencyCode || 'USD'}
                          {' '}
                          ({currencies.find(c => c.code === profile?.preferredCurrencyCode)?.symbol || '$'})
                        </p>
                      )}
                    </div>

                    {/* Account Role */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />
                        Account Type
                      </Label>
                      <Badge className={getRoleBadgeColor(profile?.role || '')}>
                        {profile?.role || 'Customer'}
                      </Badge>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
