import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Sparkles, Loader2, Check, Star } from 'lucide-react'
import { extractPriceAmount } from '@/services/productService';
import { formatPriceFromDto, formatPrice, getPriceParts, getPriceCurrency, PriceData } from '@/lib/currency';
import { WishlistButton } from '@/components/WishlistButton';
import { DiscountBadge } from '@/components/DiscountBadge';
import { PriceWithDiscount } from '@/components/PriceWithDiscount';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';

interface GiftItemCardProps {
    product: any;
    className?: string;
}

const GiftItemCard = ({ product, className }: GiftItemCardProps) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [secondImageLoaded, setSecondImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [secondImageError, setSecondImageError] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [addedToCart, setAddedToCart] = useState(false);
    
    const { addToCart, isAddingToCart } = useCart();
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    const {
        name,
        images,
        price,
        originalPrice,
        discountLabel,
    } = product

    const normalizedImages = Array.isArray(images)
        ? images
            .map((img: any) => typeof img === 'string' ? img : (img?.fullUrl || img?.url))
            .filter(Boolean)
        : [];

    const activeDiscount = product.activeDiscount;

    const displayPrice = typeof price === 'number' ? price : extractPriceAmount(price);

    const currencyCode = (typeof price === 'object' && price?.currencyCode)
        || product.currency
        || getPriceCurrency(price as PriceData)
        || 'USD';

    const priceParts = getPriceParts(displayPrice, currencyCode);

    const displayOriginalPrice = typeof originalPrice === 'number'
        ? originalPrice
        : extractPriceAmount(originalPrice);

    const formattedOriginalPrice = typeof originalPrice === 'object' && originalPrice
        ? formatPriceFromDto(originalPrice as PriceData)
        : displayOriginalPrice ? formatPrice(displayOriginalPrice, currencyCode) : null;

    const hasDiscount = !!(displayOriginalPrice && displayOriginalPrice > 0 && displayPrice < displayOriginalPrice)

    const handleActionClick: React.MouseEventHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleAddToCart: React.MouseEventHandler = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isAuthenticated) {
            const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
            navigate(`/signin?returnUrl=${returnUrl}`);
            return;
        }

        try {
            await addToCart({
                productId: product.id,
                quantity: 1,
            });
            setAddedToCart(true);
            setTimeout(() => setAddedToCart(false), 2000);
        } catch (error) {
            console.error('Failed to add to cart:', error);
        }
    };

    const primaryImage = normalizedImages[0] || '/placeholder-product.jpg';
    const secondaryImage = normalizedImages[1] || null;
    const hasSecondImage = !!secondaryImage && !secondImageError;

    return (
        <Link
            to={`/product/${product.id}`}
            className={`group block bg-white rounded-md overflow-hidden
                shadow-md hover:shadow-2xl hover:shadow-eagle-green/15
                border border-transparent hover:border-june-bud/30
                transition-all duration-500 ease-out
                ${className || ''}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Image Container */}
            <div className="relative overflow-hidden bg-gradient-to-br from-light-cream to-white rounded-t-md">
                {/* Elegant skeleton loader with shimmer */}
                {!imageLoaded && !imageError && (
                    <div className="absolute inset-0 bg-gradient-to-r from-june-bud/10 via-white to-june-bud/10 animate-shimmer"
                        style={{ backgroundSize: '200% 100%' }}
                    />
                )}

                {/* Primary Product Image */}
                <img
                    src={imageError ? '/placeholder-product.jpg' : primaryImage}
                    alt={name}
                    className={`w-full h-[260px] object-cover transition-all duration-500 ease-out rounded-t-md
                        ${imageLoaded ? 'opacity-100' : 'opacity-0'}
                        ${isHovered && hasSecondImage ? 'opacity-0' : 'opacity-100'}
                    `}
                    onLoad={() => setImageLoaded(true)}
                    onError={() => {
                        setImageError(true);
                        setImageLoaded(true);
                    }}
                    loading="lazy"
                />

                {/* Secondary Product Image (shown on hover) */}
                {secondaryImage && (
                    <img
                        src={secondImageError ? primaryImage : secondaryImage}
                        alt={`${name} - alternate view`}
                        className={`absolute inset-0 w-full h-[260px] object-cover transition-all duration-500 ease-out rounded-t-md
                            ${secondImageLoaded ? '' : 'opacity-0'}
                            ${isHovered && hasSecondImage ? 'opacity-100 scale-105' : 'opacity-0 scale-100'}
                        `}
                        onLoad={() => setSecondImageLoaded(true)}
                        onError={() => {
                            setSecondImageError(true);
                            setSecondImageLoaded(true);
                        }}
                        loading="lazy"
                    />
                )}

                {/* Gradient overlay on hover */}
                <div className={`absolute inset-0 bg-gradient-to-t from-eagle-green/60 via-transparent to-transparent
                    transition-opacity duration-500 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
                />

                {/* Discount Badge - Positioned top-left */}
                {activeDiscount ? (
                    <div className="absolute top-3 left-3 z-10">
                        <DiscountBadge 
                            discount={activeDiscount} 
                            variant="compact" 
                            size="small" 
                            targetCurrency={currencyCode}
                        />
                    </div>
                ) : (
                    hasDiscount && discountLabel && (
                        <div className="absolute top-3 left-3 z-10">
                            <div className="flex items-center gap-1.5 px-3 py-1.5 
                                bg-gradient-to-r from-warm-red to-sunset-orange
                                text-white text-xs font-bold rounded-full
                                shadow-lg shadow-warm-red/30 backdrop-blur-sm
                                transform transition-transform duration-300 group-hover:scale-110">
                                <Sparkles className="w-3 h-3" />
                                <span>{discountLabel} OFF</span>
                            </div>
                        </div>
                    )
                )}

                {/* Quick Action Buttons - Slide up on hover */}
                <div className={`absolute bottom-0 left-0 right-0 p-4
                    flex justify-center gap-3
                    transform transition-all duration-400 ease-out
                    ${isHovered ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}
                >
                    <button
                        onClick={handleAddToCart}
                        disabled={isAddingToCart}
                        className={`flex items-center justify-center w-12 h-12
                            backdrop-blur-sm rounded-md
                            shadow-lg hover:shadow-xl
                            transition-all duration-300 transform hover:scale-110
                            ${addedToCart 
                                ? 'bg-green-500 text-white' 
                                : 'bg-white/95 text-eagle-green hover:text-white hover:bg-gradient-to-br hover:from-eagle-green hover:to-viridian-green'}
                            ${isAddingToCart ? 'opacity-70 cursor-not-allowed' : ''}`}
                        aria-label="Add to cart"
                    >
                        {isAddingToCart ? (
                            <Loader2 className="w-5 h-5 animate-spin" strokeWidth={1.5} />
                        ) : addedToCart ? (
                            <Check className="w-5 h-5" strokeWidth={2} />
                        ) : (
                            <ShoppingBag className="w-5 h-5" strokeWidth={1.5} />
                        )}
                    </button>

                    <div onClick={handleActionClick} className="contents">
                        <WishlistButton
                            productId={product.id}
                            size="sm"
                            className="flex items-center justify-center w-12 h-12
                                bg-white/95 backdrop-blur-sm rounded-md
                                shadow-lg hover:shadow-xl
                                transition-all duration-300 transform hover:scale-110"
                        />
                    </div>
                </div>
            </div>

            {/* Content Container */}
            <div className="p-5">
                {/* Subcategory */}
                {product.subCategoryName && (
                    <span className="text-xs font-medium text-viridian-green uppercase tracking-wide mb-1 block">
                        {product.subCategoryName}
                    </span>
                )}

                {/* Product Name */}
                <h3 className="font-medium text-base text-eagle-green leading-snug 
                    line-clamp-2 min-h-[44px] mb-2
                    group-hover:text-viridian-green transition-colors duration-300">
                    {name}
                </h3>

                {/* Rating - always show, even with 0 reviews */}
                <div className="flex items-center gap-1 mb-2">
                    <div className="flex items-center">
                        {Array.from({ length: 5 }).map((_, i) => {
                            const reviewCount = product.reviewCount || product.totalReviews || 0;
                            const rating = reviewCount > 0 ? (product.rating || product.averageRating || 0) : 0;
                            return (
                                <Star
                                    key={i}
                                    className={`w-3.5 h-3.5 ${
                                        i < Math.floor(rating)
                                            ? 'text-yellow-400 fill-yellow-400'
                                            : 'text-gray-300'
                                    }`}
                                />
                            );
                        })}
                    </div>
                    <span className="text-xs text-gray-500">
                        ({product.reviewCount || product.totalReviews || 0})
                    </span>
                </div>

             
                <div className="flex items-end justify-between">
                    <div className="flex flex-col">
                        {activeDiscount ? (
                            <PriceWithDiscount
                                originalPrice={displayPrice}
                                currency={currencyCode}
                                discount={activeDiscount}
                                size="small"
                                showSavings={false}
                            />
                        ) : (
                            <>
                                {/* Original Price - shown when discounted */}
                                {hasDiscount && formattedOriginalPrice && (
                                    <span className="text-sm font-light text-eagle-green/50 line-through mb-0.5">
                                        {formattedOriginalPrice}
                                    </span>
                                )}

                                {/* Current Price */}
                                <div className="flex items-baseline gap-0.5">
                                    <span className="text-2xl font-bold text-eagle-green">
                                        {priceParts.symbol}{priceParts.whole}
                                    </span>
                                    {priceParts.decimal && (
                                        <span className="text-sm font-bold text-eagle-green/70">
                                            .{priceParts.decimal}
                                        </span>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Subtle indicator for more */}
                    <div className={`flex items-center gap-1 text-xs font-medium text-viridian-green
                        transition-all duration-300 ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}`}>
                        <span>View</span>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Bottom accent line */}
            <div className={`h-1 bg-gradient-to-r from-june-bud via-viridian-green to-eagle-green
                transform origin-left transition-transform duration-500 ease-out
                ${isHovered ? 'scale-x-100' : 'scale-x-0'}`}
            />
        </Link>
    )
}

export default GiftItemCard;