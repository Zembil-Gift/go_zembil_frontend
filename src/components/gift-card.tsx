import React from 'react';
import {Heart, ShoppingBag} from 'lucide-react'

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
        isLiked = false,
    } = product

    const hasDiscount = originalPrice && price < originalPrice

    return (
        <div className={`bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden ${className || ''}`}>
            {/* Image Container */}
            <div className="relative rounded-2xl overflow-hidden">
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
                        <span className="text-xl font-bold text-gray-900">
                            ${price}
                        </span>
                        {hasDiscount && (
                            <>
                                <span className="text-sm line-through text-gray-400">
                                    ${originalPrice}
                                </span>
                                <span className="text-sm text-red-600 font-medium">
                                    (${discountLabel} Off)
                                </span>
                            </>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-3">
                        <button
                            aria-label="like gift"
                            className={`text-gray-600 hover:text-red-500 transition-colors duration-200 ${
                                isLiked ? 'text-red-500' : ''
                            }`}>
                            <Heart 
                                size={24} 
                                strokeWidth={1.5} 
                                fill={isLiked ? 'currentColor' : 'none'}
                            />
                        </button>
                        <button 
                            className="text-gray-600 hover:text-primary-blue transition-colors duration-200"
                            aria-label="add to cart">
                            <ShoppingBag size={24} strokeWidth={1.5} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default GiftItemCard;