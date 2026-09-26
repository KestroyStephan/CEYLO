import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: {
          "dashboard": "Dashboard",
          "sos_monitor": "SOS Monitor",
          "destinations": "Destinations",
          "cultural_events": "CMS Content",
          "vendors": "Vendors",
          "users": "Users",
          "bookings": "Bookings",
          "marketing": "Marketing & SEO",
          "ai_center": "AI Center",
          "analytics": "Analytics",
          "notifications": "Push Broadcaster",
          "system_health": "System Health",
          "reports": "Reports",
          "welcome": "Welcome back to Ceylo Admin Portal",
          "language": "Language"
        }
      },
      si: {
        translation: {
          "dashboard": "පුවරුව",
          "sos_monitor": "SOS අධීක්ෂණය",
          "destinations": "ගමනාන්ත",
          "cultural_events": "සංස්කෘතික උත්සව",
          "vendors": "වෙළෙන්දෝ",
          "users": "පරිශීලකයින්",
          "bookings": "වෙන්කිරීම්",
          "marketing": "අලෙවිකරණය සහ SEO",
          "ai_center": "AI මධ්‍යස්ථානය",
          "analytics": "ප්‍රතිපත්තිය",
          "notifications": "නිවේදන",
          "system_health": "පද්ධති සෞඛ්‍යය",
          "reports": "වාර්තා",
          "welcome": "CEYLO පරිපාලන ද්වාරය වෙත සාදරයෙන් පිළිගනිමු",
          "language": "භාෂාව"
        }
      },
      ta: {
        translation: {
          "dashboard": "டாஷ்போர்டு",
          "sos_monitor": "SOS கண்காணிப்பு",
          "destinations": "இடங்கள்",
          "cultural_events": "நிகழ்வுகள்",
          "vendors": "விற்பனையாளர்கள்",
          "users": "பயனர்கள்",
          "bookings": "முன்பதிவுகள்",
          "marketing": "சந்தைப்படுத்தல்",
          "ai_center": "AI மையம்",
          "analytics": "பகுப்பாய்வு",
          "notifications": "அறிவிப்புகள்",
          "system_health": "கணினி ஆரோக்கியம்",
          "reports": "அறிக்கைகள்",
          "welcome": "CEYLO நிர்வாக போர்ட்டலுக்கு வரவேற்கிறோம்",
          "language": "மொழி"
        }
      }
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
