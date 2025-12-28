import { Link } from 'react-router-dom';
import { Store, MapPin, Package, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CompactRating } from './RatingSummary';
import { VendorPublicProfile } from '@/services/reviewService';
import { format } from 'date-fns';

interface VendorCardProps {
  vendor: VendorPublicProfile;
  compact?: boolean;
}

export function VendorCard({ vendor, compact = false }: VendorCardProps) {
  const memberSince = vendor.memberSince 
    ? format(new Date(vendor.memberSince), 'MMMM yyyy')
    : null;

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
        {vendor.logoUrl ? (
          <img
            src={vendor.logoUrl}
            alt={vendor.businessName}
            className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-viridian-green/10 flex items-center justify-center">
            <Store className="h-6 w-6 text-viridian-green" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <Link 
            to={`/vendor/${vendor.id}`}
            className="font-medium text-charcoal hover:text-viridian-green transition-colors"
          >
            {vendor.businessName}
          </Link>
          <CompactRating
            rating={vendor.ratingSummary.averageRating}
            reviewCount={vendor.ratingSummary.totalReviews}
            size="sm"
          />
        </div>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {vendor.logoUrl ? (
            <img
              src={vendor.logoUrl}
              alt={vendor.businessName}
              className="w-16 h-16 rounded-full object-cover border-2 border-gray-100 shadow-sm"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-viridian-green/10 flex items-center justify-center">
              <Store className="h-8 w-8 text-viridian-green" />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Link 
                to={`/vendor/${vendor.id}`}
                className="font-semibold text-lg text-charcoal hover:text-viridian-green transition-colors"
              >
                {vendor.businessName}
              </Link>
              <Badge variant="secondary" className="bg-viridian-green/10 text-viridian-green">
                Verified Seller
              </Badge>
            </div>

            <CompactRating
              rating={vendor.ratingSummary.averageRating}
              reviewCount={vendor.ratingSummary.totalReviews}
              size="md"
              className="mb-2"
            />

            {vendor.description && (
              <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                {vendor.description}
              </p>
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
  );
}
