import { Link } from "react-router-dom";
import { Gift, Phone, Mail, MapPin, Facebook, Instagram, Twitter } from "lucide-react";
import GoZembilLogo from "@/components/GoZembilLogo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useTranslation } from "react-i18next";

export default function Footer() {
  const { t } = useTranslation();
  
  return (
    <footer className="bg-charcoal text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="mb-4">
              <div className="flex items-center space-x-3">
                <GoZembilLogo size="xl" variant="icon" className="w-24 h-24" />
              </div>
            </div>
            <p className="text-gray-300 mb-6">
              {t('footer.description')}
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-300 hover:text-ethiopian-gold transition-colors duration-200">
                <Facebook size={20} />
              </a>
              <a href="#" className="text-gray-300 hover:text-ethiopian-gold transition-colors duration-200">
                <Instagram size={20} />
              </a>
              <a href="#" className="text-gray-300 hover:text-ethiopian-gold transition-colors duration-200">
                <Twitter size={20} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-lg mb-4">{t('footer.shop')}</h3>
            <ul className="space-y-3">
              <li><Link to="/about" className="text-gray-300 hover:text-white transition-colors duration-200">{t('footer.aboutUs')}</Link></li>
              <li><Link to="/gifts" className="text-gray-300 hover:text-white transition-colors duration-200">{t('footer.allGifts')}</Link></li>
              <li><Link to="/gifts?category=occasions" className="text-gray-300 hover:text-white transition-colors duration-200">{t('footer.occasions')}</Link></li>
              <li><Link to="/gifts?category=cultural" className="text-gray-300 hover:text-white transition-colors duration-200">{t('footer.culturalReligious')}</Link></li>
              <li><Link to="/custom-orders" className="text-gray-300 hover:text-white transition-colors duration-200">{t('footer.customOrders')}</Link></li>
              <li><Link to="/gift-cards" className="text-gray-300 hover:text-white transition-colors duration-200">{t('footer.giftCards')}</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold text-lg mb-4">{t('footer.support')}</h3>
            <ul className="space-y-3">
              <li><Link to="/track" className="text-gray-300 hover:text-white transition-colors duration-200">{t('footer.trackOrder')}</Link></li>
              <li><Link to="/delivery" className="text-gray-300 hover:text-white transition-colors duration-200">{t('footer.deliveryInfo')}</Link></li>
              <li><Link to="/returns" className="text-gray-300 hover:text-white transition-colors duration-200">{t('footer.returnsExchanges')}</Link></li>
              <li><Link to="/contact" className="text-gray-300 hover:text-white transition-colors duration-200">{t('footer.contactUs')}</Link></li>
              <li><Link to="/faq" className="text-gray-300 hover:text-white transition-colors duration-200">{t('footer.faq')}</Link></li>
            </ul>
          </div>

          {/* Contact & Language */}
          <div>
            <h3 className="font-semibold text-lg mb-4">{t('footer.getInTouch')}</h3>
            <div className="space-y-3 text-gray-300">
              <div className="flex items-center space-x-3">
                <Phone className="text-ethiopian-gold" size={16} />
                <span>{t('footer.phone')}</span>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="text-ethiopian-gold" size={16} />
                <span>{t('footer.email')}</span>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="text-ethiopian-gold" size={16} />
                <span>{t('footer.address')}</span>
              </div>
            </div>
            
            {/* Language Toggle */}
            <div className="mt-6">
              <h4 className="font-medium mb-2">{t('footer.language')}</h4>
              <LanguageSwitcher />
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-700 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm mb-4 md:mb-0">
            {t('footer.copyright')}
          </p>
          <div className="flex space-x-6 text-sm">
            <Link to="/privacy" className="text-gray-400 hover:text-white transition-colors duration-200">{t('footer.privacyPolicy')}</Link>
            <Link to="/terms" className="text-gray-400 hover:text-white transition-colors duration-200">{t('footer.termsOfService')}</Link>
            <Link to="/vendor-partnership" className="text-gray-400 hover:text-white transition-colors duration-200">{t('footer.vendorPartnership')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
} 