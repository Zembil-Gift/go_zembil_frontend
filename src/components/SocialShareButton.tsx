import { useState } from "react";
import { Share2, Facebook, Twitter, MessageCircle, Linkedin, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

interface SocialShareButtonProps {
  title: string;
  description?: string;
  url?: string;
  imageUrl?: string;
  hashtags?: string[];
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "ghost";
  className?: string;
}

export default function SocialShareButton({
  title,
  description = "",
  url = window.location.href,
  imageUrl = "",
  hashtags = ["goZembil", "EthiopianGifts", "GiftExperience"],
  size = "default",
  variant = "outline",
  className = "",
}: SocialShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  // Clean and encode content for sharing
  const shareTitle = encodeURIComponent(title);
  const shareDescription = encodeURIComponent(description);
  const shareUrl = encodeURIComponent(url);
  const shareImage = encodeURIComponent(imageUrl);
  const shareHashtags = hashtags.join(",");

  // Social media sharing URLs
  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}&quote=${shareTitle}${description ? `%20-%20${shareDescription}` : ""}`,
    twitter: `https://twitter.com/intent/tweet?text=${shareTitle}${description ? `%20-%20${shareDescription}` : ""}&url=${shareUrl}&hashtags=${shareHashtags}`,
    whatsapp: `https://wa.me/?text=${shareTitle}${description ? `%20-%20${shareDescription}` : ""}%20${url}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}&title=${shareTitle}&summary=${shareDescription}`,
  };

  const handleShare = (platform: keyof typeof shareLinks) => {
    const shareUrl = shareLinks[platform];
    window.open(shareUrl, "_blank", "width=600,height=400,scrollbars=yes,resizable=yes");
    
    toast({
      title: "Sharing gift experience",
      description: `Opening ${platform} to share this amazing gift experience!`,
      duration: 3000,
    });
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      
      toast({
        title: "Link copied!",
        description: "Gift experience link copied to clipboard",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Unable to copy link to clipboard",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: description,
          url: url,
        });
      } catch (error) {
        // User cancelled sharing or share failed
        console.log("Native sharing cancelled or failed");
      }
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={`${className} transition-all duration-200 hover:scale-105`}
        >
          <Share2 className="h-4 w-4 mr-2" />
          <span>Share Gift</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {/* Native sharing (mobile devices) */}
        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <>
            <DropdownMenuItem onClick={handleNativeShare} className="cursor-pointer">
              <Share2 className="mr-2 h-4 w-4" />
              <span>Share via device</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Social media platforms */}
        <DropdownMenuItem 
          onClick={() => handleShare("facebook")} 
          className="cursor-pointer hover:bg-blue-50"
        >
          <Facebook className="mr-2 h-4 w-4 text-blue-600" />
          <span>Share on Facebook</span>
        </DropdownMenuItem>

        <DropdownMenuItem 
          onClick={() => handleShare("twitter")} 
          className="cursor-pointer hover:bg-sky-50"
        >
          <Twitter className="mr-2 h-4 w-4 text-sky-500" />
          <span>Share on Twitter</span>
        </DropdownMenuItem>

        <DropdownMenuItem 
          onClick={() => handleShare("whatsapp")} 
          className="cursor-pointer hover:bg-green-50"
        >
          <MessageCircle className="mr-2 h-4 w-4 text-green-600" />
          <span>Share on WhatsApp</span>
        </DropdownMenuItem>

        <DropdownMenuItem 
          onClick={() => handleShare("linkedin")} 
          className="cursor-pointer hover:bg-blue-50"
        >
          <Linkedin className="mr-2 h-4 w-4 text-blue-700" />
          <span>Share on LinkedIn</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Copy link */}
        <DropdownMenuItem onClick={handleCopyLink} className="cursor-pointer">
          {copied ? (
            <Check className="mr-2 h-4 w-4 text-green-600" />
          ) : (
            <Copy className="mr-2 h-4 w-4" />
          )}
          <span>{copied ? "Link copied!" : "Copy link"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}