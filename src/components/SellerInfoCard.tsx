import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Store, MapPin, Calendar, Factory, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CompactRating } from "@/components/reviews";
import { cn } from "@/lib/utils";

interface SellerInfoVendor {
  businessName: string;
  link?: string;
  logoUrl?: string;
  badge?: string;
  categoryName?: string;
  rating?: { averageRating: number; totalReviews: number };
  description?: string;
  location?: string;
  memberSince?: string;
  meta?: Array<{ icon: LucideIcon; label: string }>;
}

interface SellerInfoSupplier {
  id: number | string;
  businessName: string;
}

interface SellerInfoCardProps {
  vendor?: SellerInfoVendor | null;
  suppliers?: SellerInfoSupplier[];
  className?: string;
}

export function SellerInfoCard({ vendor, suppliers = [], className }: SellerInfoCardProps) {
  if (!vendor && suppliers.length === 0) return null;

  const supplierNames = suppliers.map((s) => s.businessName).join(", ");
  const memberSinceLabel = vendor?.memberSince
    ? format(new Date(vendor.memberSince), "MMM yyyy")
    : null;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-5 sm:p-6">
        {vendor ? (
          <div className="flex items-start gap-4">
            {vendor.logoUrl ? (
              <img
                src={vendor.logoUrl}
                alt={vendor.businessName}
                className="w-14 h-14 rounded-full object-cover border-2 border-gray-100 shadow-sm shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-viridian-green/10 flex items-center justify-center shrink-0">
                <Store className="h-6 w-6 text-viridian-green" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">
                Sold by
              </p>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                {vendor.link ? (
                  <Link
                    to={vendor.link}
                    className="font-semibold text-charcoal hover:text-viridian-green transition-colors"
                  >
                    {vendor.businessName}
                  </Link>
                ) : (
                  <span className="font-semibold text-charcoal">{vendor.businessName}</span>
                )}
                {vendor.badge && (
                  <Badge variant="secondary" className="bg-viridian-green/10 text-viridian-green text-xs">
                    {vendor.badge}
                  </Badge>
                )}
                {vendor.categoryName && (
                  <Badge variant="outline" className="text-xs">
                    {vendor.categoryName}
                  </Badge>
                )}
              </div>

              {vendor.rating && (
                <CompactRating
                  rating={vendor.rating.averageRating}
                  reviewCount={vendor.rating.totalReviews}
                  size="sm"
                  className="mb-1"
                />
              )}

              {vendor.description && (
                <p className="text-sm text-gray-600 line-clamp-2 mb-2">{vendor.description}</p>
              )}

              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                {vendor.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {vendor.location}
                  </span>
                )}
                {memberSinceLabel && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 shrink-0" />
                    Since {memberSinceLabel}
                  </span>
                )}
                {vendor.meta?.map(({ icon: Icon, label }, idx) => (
                  <span key={idx} className="flex items-center gap-1">
                    <Icon className="h-3 w-3 shrink-0" />
                    {label}
                  </span>
                ))}
              </div>

              {supplierNames && (
                <p className="flex items-center gap-1 text-xs text-gray-600 mt-2">
                  <Factory className="h-3 w-3 shrink-0" />
                  Supplied by <span className="text-s text-black">{supplierNames}</span>
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-viridian-green/10 flex items-center justify-center shrink-0">
              <Factory className="h-5 w-5 text-viridian-green" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">
                Supplied by
              </p>
              <p className="font-semibold text-charcoal text-sm leading-tight">{supplierNames}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
