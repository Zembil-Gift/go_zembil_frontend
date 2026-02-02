import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { Store, MapPin, Package, Calendar, ChevronLeft, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { reviewService } from '@/services/reviewService';
import { RatingSummaryDisplay, ReviewCard, VendorReviewForm } from '@/components/reviews';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

export default function VendorDetail() {
  const { id } = useParams<{ id: string }>();
  const vendorId = Number(id);
  const { isAuthenticated } = useAuth();
  const [showReviewForm, setShowReviewForm] = useState(false);

  const { data: vendor, isLoading: vendorLoading } = useQuery({
    queryKey: ['vendor-profile', vendorId],
    queryFn: () => reviewService.getVendorPublicProfile(vendorId),
    enabled: !!vendorId,
  });

  const { data: ratingSummary } = useQuery({
    queryKey: ['vendor-rating-summary', vendorId],
    queryFn: () => reviewService.getVendorRatingSummary(vendorId),
    enabled: !!vendorId,
  });

  const { data: canReview } = useQuery({
    queryKey: ['can-review-vendor', vendorId],
    queryFn: () => reviewService.canReviewVendor(vendorId),
    enabled: !!vendorId && isAuthenticated,
  });

  const {
    data: reviewsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['vendor-reviews', vendorId],
    queryFn: ({ pageParam = 0 }) => reviewService.getVendorReviews(vendorId, pageParam, 10),
    getNextPageParam: (lastPage) => (lastPage.last ? undefined : lastPage.number + 1),
    initialPageParam: 0,
    enabled: !!vendorId,
  });

  const reviews = reviewsData?.pages.flatMap((page) => page.content) || [];
  const memberSince = vendor?.memberSince ? format(new Date(vendor.memberSince), 'MMMM yyyy') : null;

  if (vendorLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4" />
            <div className="flex gap-6">
              <div className="w-24 h-24 bg-gray-200 rounded-full" />
              <div className="flex-1 space-y-3">
                <div className="h-6 bg-gray-200 rounded w-1/3" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Vendor not found</h1>
          <Link to="/shop">
            <Button className="bg-viridian-green hover:bg-viridian-green/90">
              Browse Shop
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back link */}
        <Link
          to="/shop"
          className="inline-flex items-center text-sm text-gray-600 hover:text-viridian-green mb-6"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Shop
        </Link>

        {/* Vendor Header */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              {vendor.logoUrl ? (
                <img
                  src={vendor.logoUrl}
                  alt={vendor.businessName}
                  className="w-24 h-24 rounded-full object-cover border-4 border-gray-100 shadow-md"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-viridian-green/10 flex items-center justify-center">
                  <Store className="h-12 w-12 text-viridian-green" />
                </div>
              )}

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-charcoal">{vendor.businessName}</h1>
                  <Badge className="bg-viridian-green/10 text-viridian-green">Verified Seller</Badge>
                </div>
                
                {vendor.vendorCategoryName && (
                  <div className="mb-2">
                    <Badge variant="outline" className="text-sm">
                      {vendor.vendorCategoryName}
                    </Badge>
                  </div>
                )}

                {/* Rating */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center">
                    <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                    <span className="ml-1 font-semibold">
                      {vendor.ratingSummary.averageRating.toFixed(1)}
                    </span>
                  </div>
                  <span className="text-gray-500">
                    ({vendor.ratingSummary.totalReviews} reviews)
                  </span>
                </div>

                {vendor.description && (
                  <p className="text-gray-600 mb-4">{vendor.description}</p>
                )}

                <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                  {vendor.city && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{vendor.city}{vendor.country ? `, ${vendor.country}` : ''}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Package className="h-4 w-4" />
                    <span>{vendor.totalProducts} products</span>
                  </div>
                  {memberSince && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>Member since {memberSince}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="reviews" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="reviews">
              Reviews {ratingSummary && `(${ratingSummary.totalReviews})`}
            </TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>

          <TabsContent value="reviews" className="mt-6 space-y-6">
            {/* Rating Summary */}
            {ratingSummary && ratingSummary.totalReviews > 0 && (
              <RatingSummaryDisplay summary={ratingSummary} />
            )}

            {/* Write Review */}
            {isAuthenticated && canReview && (
              <Card>
                <CardContent className="p-6">
                  {showReviewForm ? (
                    <VendorReviewForm
                      vendorId={vendorId}
                      compact
                      onSuccess={() => setShowReviewForm(false)}
                      onCancel={() => setShowReviewForm(false)}
                    />
                  ) : (
                    <div className="text-center">
                      <p className="text-gray-600 mb-3">Share your experience with this vendor</p>
                      <Button
                        onClick={() => setShowReviewForm(true)}
                        className="bg-viridian-green hover:bg-viridian-green/90"
                      >
                        Write a Review
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {!isAuthenticated && (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-gray-600 mb-3">Sign in to leave a review</p>
                  <Link to="/signin">
                    <Button variant="outline">Sign In</Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Reviews List */}
            {reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}

                {hasNextPage && (
                  <div className="text-center pt-4">
                    <Button
                      variant="outline"
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                    >
                      {isFetchingNextPage ? 'Loading...' : 'Load More Reviews'}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-gray-500">No reviews yet. Be the first to review!</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="about" className="mt-6">
            <Card>
              <CardContent className="p-6 space-y-4">
                <h3 className="font-semibold text-lg">About {vendor.businessName}</h3>
                {vendor.description ? (
                  <p className="text-gray-600">{vendor.description}</p>
                ) : (
                  <p className="text-gray-500 italic">No description provided.</p>
                )}

                <div className="pt-4 border-t space-y-3">
                  <h4 className="font-medium">Seller Information</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    {vendor.city && (
                      <div>
                        <span className="text-gray-500">Location:</span>
                        <span className="ml-2">{vendor.city}{vendor.country ? `, ${vendor.country}` : ''}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-500">Products:</span>
                      <span className="ml-2">{vendor.totalProducts}</span>
                    </div>
                    {memberSince && (
                      <div>
                        <span className="text-gray-500">Member since:</span>
                        <span className="ml-2">{memberSince}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-500">Rating:</span>
                      <span className="ml-2">
                        {vendor.ratingSummary.averageRating.toFixed(1)} ({vendor.ratingSummary.totalReviews} reviews)
                      </span>
                    </div>
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
