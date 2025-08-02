// Using URL for public assets instead of import
const logoImagePath = "/attached_assets/logo-02.png";

interface GoZembilLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon' | 'text';
  showTagline?: boolean;
}

export default function GoZembilLogo({ 
  className = '', 
  size = 'md',
  variant = 'full',
  showTagline = true
}: GoZembilLogoProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8', 
    lg: 'h-10 w-10',
    xl: 'h-12 w-12'
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl',
    xl: 'text-2xl'
  };

  const taglineSizes = {
    sm: 'text-xs',
    md: 'text-xs',
    lg: 'text-sm', 
    xl: 'text-sm'
  };

  // Icon only
  if (variant === 'icon') {
    return (
      <img 
        src={logoImagePath} 
        alt="goZembil Logo"
        className={`${sizeClasses[size]} object-contain ${className}`}
      />
    );
  }

  // Text only
  if (variant === 'text') {
    return (
      <div className={`flex flex-col ${className}`}>
        <div className="flex items-center">
          <span className={`${textSizes[size]} font-display font-bold text-deep-forest`}>go</span>
          <span className={`${textSizes[size]} font-display font-bold text-zembil-brown`}>Zembil</span>
        </div>
        {showTagline && (size === 'lg' || size === 'xl') && (
          <span className={`${taglineSizes[size]} font-medium text-warm-gold leading-none`}>
            Gifting with Heart
          </span>
        )}
      </div>
    );
  }

  // Full logo with icon and text
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <img 
        src={logoImagePath} 
        alt="goZembil Logo"
        className={`${sizeClasses[size]} object-contain flex-shrink-0`}
      />
      <div className="flex flex-col">
        <div className="flex items-center">
          <span className={`${textSizes[size]} font-display font-bold text-deep-forest`}>go</span>
          <span className={`${textSizes[size]} font-display font-bold text-zembil-brown`}>Zembil</span>
        </div>
        {showTagline && (size === 'lg' || size === 'xl') && (
          <span className={`${taglineSizes[size]} font-medium text-warm-gold leading-none -mt-0.5`}>
            Gifting with Heart
          </span>
        )}
      </div>
    </div>
  );
}