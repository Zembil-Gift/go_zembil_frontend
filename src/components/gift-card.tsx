import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react'
import { extractPriceAmount } from '@/services/productService';
import { formatPriceFromDto, formatPrice, getPriceParts, getPriceCurrency, PriceData } from '@/lib/currency';
import { WishlistButton } from '@/components/WishlistButton';

interface GiftItemCardProps {
    product: any;
    className?: string;
}

const GiftItemCard = ({product, className}: GiftItemCardProps) => {
    const {
        name,
        images,
        price,
        originalPrice,
        discountLabel,
    } = product

    const displayPrice = typeof price === 'number' ? price : extractPriceAmount(price);
    
    const currencyCode = (typeof price === 'object' && price?.currencyCode)
        || product.currency
        || getPriceCurrency(price as PriceData)
        || 'USD';
    
    typeof price === 'object' && price
        ? formatPriceFromDto(price as PriceData)
        : formatPrice(displayPrice, currencyCode);
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

    return (
        <Link to={`/product/${product.id}`} className={`block rounded-2xl transition-all duration-300 overflow-hidden hover:shadow-md ${className || ''}`}>
            {/* Image Container */}
            <div className="relative rounded-t-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                <img
                    src={images?.[0] || '/api/placeholder/400/400'}
                    alt={name}
                    className="w-full h-[280px] object-cover"
                />
            </div>

            {/* Content Container */}
            <div className="p-4">
                {/* Product Name */}
                <h3 className="text-lg font-medium text-gray-800 leading-tight mb-3 line-clamp-2 min-h-[48px]">
                    {name}
                </h3>

                {/* Price and Actions Row */}
                <div className="flex items-center justify-between">
                    {/* Price Section */}
                    <div className="flex items-baseline space-x-2">
                        <span className="text-xl text-gray-900">
                            <span className="font-bold">{priceParts.symbol}{priceParts.whole}</span>
                            {priceParts.decimal && <span className='font-bold'>.{priceParts.decimal}</span>}
                        </span>
                        {hasDiscount && formattedOriginalPrice && (
                            <>
                                <span className="text-sm line-through text-gray-400">
                                    {formattedOriginalPrice}
                                </span>
                                {discountLabel && (
                                    <span className="text-sm text-red-600 font-medium">
                                        ({discountLabel} Off)
                                    </span>
                                )}
                            </>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-3">
                        <WishlistButton 
                            productId={product.id}
                            size="sm"
                            showLabel={false}
                        />
                        <button 
                            onClick={handleActionClick}
                            className="text-gray-600 hover:text-primary-blue transition-colors duration-200"
                            aria-label="add to cart">
                            <ShoppingBag size={24} strokeWidth={1.5} />
                        </button>
                    </div>
                </div>
            </div>
        </Link>
    )
}

export default GiftItemCard;