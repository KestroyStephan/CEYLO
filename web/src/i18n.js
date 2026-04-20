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
          "cultural_events": "Cultural Events",
          "vendors": "Vendors",
          "users": "Users",
          "analytics": "Analytics",
          "notifications": "Push Broadcaster",
          "system_health": "System Health",
          "reports": "Reports",
          "welcome": "Welcome back to Sharoobini Admin Portal",
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
          "analytics": "ප්‍රතිපත්තිය",
          "notifications": "නිවේදන",
          "system_health": "පද්ධති සෞඛ්‍යය",
          "reports": "වාර්තා",
          "welcome": "ෂාරුබිනී පරිපාලන ද්වාරය වෙත සාදරයෙන් පිළිගනිමු",
          "language": "භාෂාව"
        }
      }
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
