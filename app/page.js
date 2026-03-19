'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { supabase } from '../lib/supabase';
import { safeLocalStorage } from '../lib/localStorage';
import { getItemLineTotal, computeCartTotalWithExtras } from '@/lib/cartUtils';
import { 
  FaSearch, 
  FaStar, 
  FaClock, 
  FaMotorcycle, 
  FaFilter, 
  FaHeart,
  FaShoppingCart,
  FaTimes,
  FaPlus,
  FaMinus,
  FaUser,
  FaSignInAlt,
  FaUserPlus,
  FaGift,
  FaFire,
  FaLeaf,
  FaUtensils,
  FaPizzaSlice,
  FaHamburger,
  FaCoffee,
  FaIceCream,
  FaSignOutAlt,
  FaTruck,
  FaStore,
  FaImage
} from 'react-icons/fa';
import AdBanner from '@/components/AdBanner';
import Advertisement from '@/components/Advertisement';
import OptimizedRestaurantImage from '@/components/OptimizedRestaurantImage';
import RestaurantCardSkeleton from '@/components/RestaurantCardSkeleton';
import { FacebookPixelEvents } from '@/components/FacebookPixel';
import FreeDeliveryBanner from '@/components/FreeDeliveryBanner';

const TARGET_OPENING_HOUR = 18;
const READY_RESTAURANTS_LABEL = '';
const READY_RESTAURANTS = new Set();

// Restaurants en vacances ou fermés de manière permanente (ne pas afficher "Ouvre à : [heure]")
// NOTE: Les restaurants suivants ont repris le service et ne sont plus en congés :
// - Le Cévenol Burger
// - L'Assiette des Saisons
// - Le 99 Street Food
// - Le O'Saona Tea
const RESTAURANTS_EN_VACANCES = new Set([
  // Liste vide - tous les restaurants ont repris
]);

// Restaurants pas encore prêts/opérationnels
const RESTAURANTS_NON_OPERATIONNELS = new Set([
]);

// Restaurants à ne plus afficher (fermés définitivement / retirés)
const RESTAURANTS_MASQUES = new Set([
  'molokai',
  'le molokai',
  'o toasty',
  'otoasty',
  "o'toasty"
]);
// Mots-clés : si le nom normalisé contient l’un d’eux, le restaurant est masqué
const RESTAURANTS_MASQUES_CONTIENT = ['molokai', 'otoasty'];

const normalizeName = (value = '') =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const normalizeToken = (value = '') =>
  value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const extractKeywords = (value) => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .flatMap((item) => extractKeywords(item))
      .filter(Boolean);
  }

  if (typeof value === 'object') {
    return Object.values(value || {})
      .flatMap((val) => extractKeywords(val))
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    // Tenter de parser un JSON array
    if (
      (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
      (trimmed.startsWith('{') && trimmed.endsWith('}'))
    ) {
      try {
        const parsed = JSON.parse(trimmed);
        return extractKeywords(parsed);
      } catch (err) {
        // Ignorer si non JSON valide
      }
    }

    return trimmed
      .split(/[,;\/|&]| et |\n|\r|\t/gi)
      .map((token) => normalizeToken(token))
      .filter(Boolean);
  }

  return [normalizeToken(value)];
};

const getCategoryTokensForRestaurant = (restaurant = {}) => {
  const sources = [
    restaurant.cuisine_type,
    restaurant.type_cuisine,
    restaurant.categories,
    restaurant.category,
    restaurant.categorie,
    restaurant.type,
    restaurant.tags,
    restaurant.keywords,
    restaurant.specialites,
    restaurant.specialities,
    restaurant.description
  ];

  const tokens = sources
    .flatMap((source) => extractKeywords(source))
    .filter(Boolean);

  return Array.from(new Set(tokens.map(normalizeToken))).filter(Boolean);
};

const getNextOpeningDate = () => {
  const target = new Date();
  target.setDate(target.getDate() + 1);
  target.setHours(TARGET_OPENING_HOUR, 0, 0, 0);
  return target;
};

const formatTimeForLabel = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const [hours, minutes = '00'] = timeStr.split(':');
  if (hours === undefined) return timeStr;
  return `${hours.padStart(2, '0')}h${minutes.padStart(2, '0')}`;
};

const formatTimeRangeLabel = (start, end) => {
  const formattedStart = formatTimeForLabel(start);
  const formattedEnd = formatTimeForLabel(end);
  if (!formattedStart || !formattedEnd) return null;
  return `${formattedStart} - ${formattedEnd}`;
};

const getTodayHoursLabel = (restaurant = {}) => {
  try {
    let horaires = restaurant.horaires;
    if (!horaires) return null;
    if (typeof horaires === 'string') {
      try { horaires = JSON.parse(horaires); } catch { return null; }
    }
    const heuresJour = getHeuresJourForToday(horaires);
    if (!heuresJour) return null;

    if (Array.isArray(heuresJour.plages) && heuresJour.plages.length > 0) {
      const ranges = heuresJour.plages
        .map(plage => formatTimeRangeLabel(plage?.ouverture || plage?.debut, plage?.fermeture || plage?.fin))
        .filter(Boolean);
      return ranges.length > 0 ? ranges.join(' / ') : null;
    }

    return formatTimeRangeLabel(heuresJour?.ouverture, heuresJour?.fermeture);
  } catch {
    return null;
  }
};

const formatStatusHoursLabel = (statusData, fallback) => {
  if (!statusData) return fallback || null;

  if (Array.isArray(statusData.plages) && statusData.plages.length > 0) {
    const ranges = statusData.plages
      .map(plage => formatTimeRangeLabel(plage?.ouverture, plage?.fermeture))
      .filter(Boolean);
    if (ranges.length > 0) {
      return ranges.join(' / ');
    }
  }

  const singleRange = formatTimeRangeLabel(statusData.openTime, statusData.closeTime);
  if (singleRange) return singleRange;

  return fallback || null;
};

// Fonction pour obtenir la prochaine heure d'ouverture d'un restaurant avec le jour
const getNextOpeningTime = (restaurant = {}) => {
  try {
    let horaires = restaurant.horaires;
    if (!horaires) return null;

    if (typeof horaires === 'string') {
      try { horaires = JSON.parse(horaires); } catch { return null; }
    }

    const todayFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', timeZone: 'Europe/Paris' });
    const now = new Date();
    const todayName = todayFormatter.format(now).toLowerCase();
    
    // Heure Paris robuste (formatToParts évite le bug toLocaleString = date+heure)
    const timeParts = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(now);
    const currentHours = parseInt(timeParts.find(p => p.type === 'hour')?.value || '0', 10);
    const currentMinutes = parseInt(timeParts.find(p => p.type === 'minute')?.value || '0', 10);
    const currentTime = currentHours * 60 + currentMinutes;

    // Vérifier les 7 prochains jours (index basé sur Paris pour cohérence)
    const daysOfWeek = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const daysOfWeekLabels = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const currentDayIndex = daysOfWeek.indexOf(todayName);
    if (currentDayIndex < 0) return null;

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const checkDayIndex = (currentDayIndex + dayOffset) % 7;
      const checkDayName = daysOfWeek[checkDayIndex];
      const checkDayVariants = [checkDayName, checkDayName.charAt(0).toUpperCase() + checkDayName.slice(1), checkDayName.toUpperCase()];
      let heuresJour = null;
      for (const key of checkDayVariants) {
        if (horaires?.[key]) {
          heuresJour = horaires[key];
          break;
        }
      }
      if (!heuresJour && horaires[checkDayIndex] !== undefined) heuresJour = horaires[checkDayIndex];

      if (!heuresJour || heuresJour.is_closed === true) continue;

      // Vérifier les plages horaires
      const parseTime = (timeStr) => {
        if (!timeStr) return null;
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
      };

      let nextOpeningTime = null;

      if (Array.isArray(heuresJour.plages) && heuresJour.plages.length > 0) {
        // Nouveau format avec plages multiples (ouverture/fermeture ou debut/fin)
        for (const plage of heuresJour.plages) {
          const openStr = plage.ouverture || plage.debut;
          if (!openStr) continue;
          const openTime = parseTime(openStr);
          if (openTime === null) continue;

          // Si c'est aujourd'hui et que l'heure d'ouverture est dans le futur
          if (dayOffset === 0 && currentTime < openTime) {
            nextOpeningTime = openStr;
            break;
          }
          // Si c'est un jour futur, retourner la première heure d'ouverture
          if (dayOffset > 0) {
            nextOpeningTime = openStr;
            break;
          }
        }
      } else if ((heuresJour.ouverture || heuresJour.debut) && (heuresJour.fermeture || heuresJour.fin)) {
        // Ancien format avec une seule plage
        const openStr = heuresJour.ouverture || heuresJour.debut;
        const openTime = parseTime(openStr);
        if (openTime !== null) {
          if (dayOffset === 0 && currentTime < openTime) nextOpeningTime = openStr;
          if (dayOffset > 0) nextOpeningTime = openStr;
        }
      } else if (heuresJour.ouvert === true || heuresJour.ouvert === 'true' || heuresJour.ouvert === 1) {
        // Si ouvert toute la journée et c'est un jour futur
        if (dayOffset > 0) {
          nextOpeningTime = '00:00';
        }
      }

      if (nextOpeningTime) {
        // Si c'est un jour futur (pas aujourd'hui), inclure le nom du jour
        if (dayOffset > 0) {
          const dayLabel = daysOfWeekLabels[checkDayIndex];
          return { time: nextOpeningTime, day: dayLabel };
        } else {
          return { time: nextOpeningTime, day: null };
        }
      }
    }

    return null; // Aucune ouverture trouvée
  } catch (e) {
    console.error('[getNextOpeningTime] Erreur:', e);
    return null;
  }
};

// Parse "HH:MM" ou "HHhMM" en minutes depuis minuit. 00:00 en fermeture = 24h (1440).
const parseTimeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const trimmed = timeStr.trim();
  const match = trimmed.match(/^(\d{1,2})[h:](\d{2})$/);
  const h = match ? parseInt(match[1], 10) : parseInt(trimmed.split(':')[0], 10);
  const m = match ? parseInt(match[2], 10) : parseInt(trimmed.split(':')[1] || '0', 10);
  if (Number.isNaN(h) || Number.isNaN(m) || h < 0 || h > 24 || m < 0 || m > 59) return null;
  let tot = h * 60 + m;
  if (tot === 0 && h === 0 && m === 0) tot = 1440;
  if (trimmed === '24:00' || trimmed === '24h00') tot = 1440;
  return tot;
};

// Tolérant: certaines BDD ont `horaires` en JSON string (voire double-encodé).
const coerceHorairesObject = (horairesRaw) => {
  let h = horairesRaw;
  for (let i = 0; i < 3; i += 1) {
    if (typeof h !== 'string') break;
    const s = h.trim();
    if (!s) break;
    // Tenter parse JSON; si ça échoue, on stop.
    try {
      h = JSON.parse(s);
    } catch {
      break;
    }
  }
  // Parfois stocké sous forme { horaires: {...} }
  if (h && typeof h === 'object' && !Array.isArray(h) && h.horaires && typeof h.horaires === 'object') {
    return h.horaires;
  }
  return h;
};

// Heure et jour en Europe/Paris (référence unique pour les horaires des restos en France).
const getParisNow = () => {
  const now = new Date();
  const dayNamesFr = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  try {
    const formatter = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'long' });
    const parts = formatter.formatToParts(now);
    const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
    const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
    const weekday = (parts.find((p) => p.type === 'weekday')?.value || '').toLowerCase();
    const dayIndex = dayNamesFr.indexOf(weekday);
    return { hour, minute, dayIndex: dayIndex >= 0 ? dayIndex : now.getDay(), todayName: weekday || dayNamesFr[now.getDay()], dayNamesFr };
  } catch (_) {
    const dayIndex = now.getDay();
    return { hour: now.getHours(), minute: now.getMinutes(), dayIndex, todayName: dayNamesFr[dayIndex] || 'lundi', dayNamesFr };
  }
};

// Récupère les horaires du jour actuel (jour et heure en Europe/Paris pour cohérence).
const getHeuresJourForToday = (horaires) => {
  if (!horaires || typeof horaires !== 'object') return null;
  const { dayIndex, todayName, dayNamesFr } = getParisNow();
  const dayNamesEn = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayEn = dayNamesEn[dayIndex] || 'monday';
  // Support: horaires stockés en ARRAY où index 0 = LUNDI
  if (Array.isArray(horaires) && horaires.length >= 7) {
    const dayNamesMonday0 = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
    const idxMonday0 = dayNamesMonday0.indexOf(todayName);
    if (idxMonday0 >= 0 && horaires[idxMonday0] != null) return horaires[idxMonday0];
  }

  // Variantes possibles des clés (FR/EN + abréviations + index)
  const candidates = new Set();
  const add = (v) => { if (v != null && String(v).trim() !== '') candidates.add(String(v)); };

  add(todayName);
  add(todayName.charAt(0).toUpperCase() + todayName.slice(1));
  add(todayName.toUpperCase());
  if (todayEn) {
    add(todayEn);
    add(todayEn.charAt(0).toUpperCase() + todayEn.slice(1));
    add(todayEn.toUpperCase());
    add(todayEn.slice(0, 3)); // mon, tue...
    add(todayEn.slice(0, 3).toUpperCase()); // MON...
  }
  // Abréviations FR (lun, mar, mer...)
  add(todayName.slice(0, 3));
  add(todayName.slice(0, 3).toUpperCase());

  // Index jour (0..6) parfois stocké en clé string
  add(dayIndex);
  add(String(dayIndex));

  // 1) Accès direct par candidates
  for (const key of candidates) {
    if (horaires[key] != null) return horaires[key];
  }
  // 2) Accès direct par index numérique si l'objet est un tableau / pseudo-tableau
  if (dayIndex >= 0 && horaires[dayIndex] != null) return horaires[dayIndex];
  // 3) Fallback : comparer les clés en lowercase trim
  const candidatesLower = new Set(Array.from(candidates).map((k) => String(k).trim().toLowerCase()));
  for (const k of Object.keys(horaires)) {
    if (candidatesLower.has(String(k).trim().toLowerCase())) return horaires[k];
  }
  return null;
};

// Ouvert/fermé : basé sur les horaires (Europe/Paris).
// Override: si ferme_manuellement = true → fermé.
const checkRestaurantOpenStatus = (restaurant = {}) => {
  try {
    const fm = restaurant.ferme_manuellement;
    const isManuallyClosed =
      fm === true || fm === 1 || fm === 'true' || fm === '1' ||
      (typeof fm === 'string' && String(fm).trim().toLowerCase() === 'true');
    if (isManuallyClosed) return { isOpen: false, isManuallyClosed: true, reason: 'manual' };

    const om = restaurant.ouvert_manuellement;
    const isManuallyOpen =
      om === true || om === 1 || om === 'true' || om === '1' ||
      (typeof om === 'string' && String(om).trim().toLowerCase() === 'true');
    if (isManuallyOpen) return { isOpen: true, isManuallyClosed: false, reason: 'manual_open' };

    // Si l'API fournit déjà is_open_now (calcul serveur), on l'utilise.
    if (restaurant.is_open_now === true || restaurant.is_open_now === 1 || restaurant.is_open_now === 'true') {
      return { isOpen: true, isManuallyClosed: false, reason: 'horaires_server' };
    }
    if (restaurant.is_open_now === false || restaurant.is_open_now === 0 || restaurant.is_open_now === 'false') {
      return { isOpen: false, isManuallyClosed: false, reason: 'horaires_server' };
    }

    // Fallback client (Capacitor): calcul Europe/Paris depuis horaires
    const horaires = coerceHorairesObject(restaurant.horaires);
    const day = getHeuresJourForToday(horaires);
    if (!day || day.is_closed === true || day.ferme === true) {
      return { isOpen: false, isManuallyClosed: false, reason: 'closed_today' };
    }

    const now = getParisNow();
    const current = now.hours * 60 + now.minutes;
    const toMinutes = (timeStr) => parseTimeToMinutes(timeStr);
    const inRange = (start, end, isMidnightClose) => {
      if (start == null || end == null) return false;
      if (isMidnightClose) return current >= start;
      const spansMidnight = end < start;
      return spansMidnight ? (current >= start || current <= end) : (current >= start && current <= end);
    };

    const hasPlages = Array.isArray(day.plages) && day.plages.length > 0;
    const hasSingleRange = Boolean((day.ouverture || day.debut) && (day.fermeture || day.fin));
    const hasExplicitHours = hasPlages || hasSingleRange;
    if (!hasExplicitHours && day.ouvert === false) {
      return { isOpen: false, isManuallyClosed: false, reason: 'closed_today' };
    }

    if (hasPlages) {
      const open = day.plages.some((plage) => {
        const openStr = plage?.ouverture || plage?.debut;
        const closeStr = plage?.fermeture || plage?.fin;
        const start = toMinutes(openStr);
        const end = toMinutes(closeStr);
        const closeRaw = String(closeStr || '').trim();
        const isMidnightClose = closeRaw === '00:00' || closeRaw === '0:00';
        return inRange(start, end, isMidnightClose);
      });
      return { isOpen: open, isManuallyClosed: false, reason: open ? 'open' : 'outside_hours' };
    }

    const openStr = day.ouverture || day.debut;
    const closeStr = day.fermeture || day.fin;
    const start = toMinutes(openStr);
    const end = toMinutes(closeStr);
    const closeRaw = String(closeStr || '').trim();
    const isMidnightClose = closeRaw === '00:00' || closeRaw === '0:00';
    const open = inRange(start, end, isMidnightClose);
    return { isOpen: open, isManuallyClosed: false, reason: open ? 'open' : 'outside_hours' };
  } catch (e) {
    console.error('[checkRestaurantOpenStatus] Erreur:', restaurant?.nom || restaurant?.id, e);
    return { isOpen: false, isManuallyClosed: false, reason: 'error' };
  }
};

// Runtime edge désactivé pour permettre l'export statique (mobile)
// export const dynamic = 'force-dynamic';
// export const runtime = 'edge';

export default function Home() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastTrackedSearch, setLastTrackedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('recommended');
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [user, setUser] = useState(null);
  const [userPoints, setUserPoints] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const [showFloatingCart, setShowFloatingCart] = useState(false);
  const [addingToCart, setAddingToCart] = useState({}); // Pour l'animation d'ajout au panier
  const [showCartNotification, setShowCartNotification] = useState(false); // Pour la notification d'ajout
  const [restaurantsOpenStatus, setRestaurantsOpenStatus] = useState({}); // Statut d'ouverture de chaque restaurant
  const openStatusRef = useRef({}); // Evite les bascules si le détail n'est pas récupéré (ou rate)
  const [isRestaurantRoute, setIsRestaurantRoute] = useState(false);
  const [hasActiveOrder, setHasActiveOrder] = useState(false); // Commande en cours pour mettre en avant "Ma commande"

  const searchInputRef = useRef(null);
  const lastFocusKeyRef = useRef('');

  // Focus automatique sur la barre de recherche si on arrive via l'onglet "Rechercher"
  useEffect(() => {
    const focus = searchParams?.get('focus');
    const key = `${focus || ''}::${searchParams?.get('t') || ''}`;
    if (focus !== 'search') return;
    if (lastFocusKeyRef.current === key) return;
    lastFocusKeyRef.current = key;

    setTimeout(() => {
      try {
        if (searchInputRef.current) {
          searchInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          searchInputRef.current.focus();
        }
      } catch {
        // ignore
      }
    }, 50);
  }, [searchParams]);
  
  const nextOpeningDate = useMemo(() => getNextOpeningDate(), []);
  const nextOpeningLabel = useMemo(() => {
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit'
    }).format(nextOpeningDate);
  }, [nextOpeningDate]);

  // Fonction de déconnexion
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserPoints(0);
    router.push('/');
  };

  // Catégories de restaurants avec icônes et couleurs
  const categories = [
    { id: 'all', name: 'Tous', icon: FaUtensils, color: 'from-orange-500 to-amber-600', tagline: 'Tout découvrir' },
    { id: 'offres', name: 'Offres', icon: FaGift, color: 'from-red-500 to-orange-500', tagline: 'Promos & réductions' },
    { id: 'traditional', name: 'Traditionnel', icon: FaUtensils, color: 'from-amber-600 to-red-500', tagline: 'Recettes authentiques' },
    { id: 'pizza', name: 'Pizza', icon: FaPizzaSlice, color: 'from-red-500 to-orange-500', tagline: 'Aux saveurs d\'Italie' },
    { id: 'burger', name: 'Burgers', icon: FaHamburger, color: 'from-amber-500 to-orange-500', tagline: 'Gourmand et fondant' },
    { id: 'coffee', name: 'Café', icon: FaCoffee, color: 'from-amber-600 to-yellow-600', tagline: 'Pause sucrée' },
    { id: 'dessert', name: 'Desserts', icon: FaIceCream, color: 'from-pink-400 to-orange-400', tagline: 'Douceurs sucrées' },
    { id: 'healthy', name: 'Healthy', icon: FaLeaf, color: 'from-green-500 to-emerald-500', tagline: 'Léger & vitaminé' },
    { id: 'fast', name: 'Fast Food', icon: FaFire, color: 'from-orange-500 to-red-500', tagline: 'Rapide & efficace' }
  ];

  const heroSlides = useMemo(() => [
    {
      id: 'slide-1',
      image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2070&auto=format&fit=crop',
      title: 'Livraison rapide et repas délicieux',
      subtitle: 'Découvrez les meilleurs restaurants locaux sans bouger de votre canapé'
    },
    {
      id: 'slide-2',
      image: 'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?q=80&w=2000&auto=format&fit=crop',
      title: 'Partenaires passionnés',
      subtitle: 'Des chefs soigneusement sélectionnés pour la qualité de leurs produits'
    },
    {
      id: 'slide-3',
      image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=2070&auto=format&fit=crop',
      title: 'Commandez en toute simplicité',
      subtitle: 'Une expérience de commande fluide et sécurisée pour satisfaire vos envies'
    }
  ], []);

  const [currentSlide, setCurrentSlide] = useState(0);

  // Synchroniser le panier avec le localStorage (panier rempli depuis une page restaurant)
  useEffect(() => {
    try {
      const saved = safeLocalStorage.getJSON('cart');
      if (saved && Array.isArray(saved.items) && saved.items.length > 0) {
        setCart(saved.items);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    setIsClient(true);
    
    // Détecter si on est sur une route de restaurant et NE PAS charger la page d'accueil
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const restaurantMatch = path.match(/\/restaurants\/([^\/\?]+)/);
      
      if (restaurantMatch && restaurantMatch[1]) {
        const restaurantId = restaurantMatch[1];
        console.log('[Home] 🔍 Route restaurant détectée:', restaurantId);
        console.log('[Home] ⚠️ Cette page ne devrait pas être chargée pour /restaurants/[id]');
        console.log('[Home] 💡 Le script de routage devrait charger RestaurantDetail');
        // Ne pas charger la page d'accueil, mais laisser le script de routage gérer
        // Le script dans le HTML devrait charger le composant RestaurantDetail
      }
    }
    
    // Dans l'app mobile, vérifier l'authentification UNIQUEMENT si on est sur la page d'accueil
    // Ne pas bloquer la navigation vers d'autres pages
    const checkMobileAuth = async () => {
      if (typeof window === 'undefined') return;
      
      // Ne vérifier que si on est vraiment sur la page d'accueil (pas en train de naviguer)
      if (window.location.pathname !== '/' && window.location.pathname !== '') {
        return; // Ne pas bloquer la navigation vers d'autres pages
      }
      
      const isCapacitorApp = window.location.protocol === 'capacitor:' || 
                            window.location.href.indexOf('capacitor://') === 0 ||
                            window.Capacitor !== undefined;
      
      if (isCapacitorApp) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          
          if (!session?.user) {
            // Pas connecté dans l'app mobile, rediriger vers login
            // Utiliser setTimeout pour éviter de bloquer la navigation
            setTimeout(() => {
              router.replace('/login');
            }, 100);
            return;
          }
        } catch (error) {
          console.error('Erreur vérification auth:', error);
          // Ne pas rediriger en cas d'erreur pour ne pas bloquer la navigation
        }
      }
    };
    
    // Délai pour éviter de bloquer la navigation
    const timeoutId = setTimeout(checkMobileAuth, 200);
    
    return () => clearTimeout(timeoutId);
  }, [router]);

  useEffect(() => {
    if (!heroSlides.length) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  // Track Facebook Pixel - Search (avec debounce)
  useEffect(() => {
    if (searchTerm && searchTerm.length >= 3 && searchTerm !== lastTrackedSearch) {
      const timer = setTimeout(() => {
        FacebookPixelEvents.search(searchTerm);
        setLastTrackedSearch(searchTerm);
      }, 1000); // Debounce de 1 seconde
      return () => clearTimeout(timer);
    }
  }, [searchTerm, lastTrackedSearch]);

  useEffect(() => {
    // Verifier l'authentification
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        try {
          const { data: userData } = await supabase
            .from('users')
            .select('role, points_fidelite')
            .eq('id', user.id)
            .single();
          
          if (userData) {
            setUserPoints(userData.points_fidelite || 0);
            // Stocker le rôle pour vérifier l'accès aux pages
            if (userData.role) {
              localStorage.setItem('userRole', userData.role);
            }
          }
          // Vérifier si l'utilisateur a une commande active (pas livrée/annulée)
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            const res = await fetch('/api/orders', { headers: { Authorization: `Bearer ${session.access_token}` } });
            if (res.ok) {
              const orders = await res.json();
              const active = Array.isArray(orders) && orders.some(o => {
                const s = (o.status || o.statut || '').toLowerCase();
                return s && s !== 'livree' && s !== 'delivered' && s !== 'annulee' && s !== 'cancelled';
              });
              setHasActiveOrder(!!active);
            }
          }
        } catch (error) {
          console.error('Erreur recuperation points:', error);
        }
      } else {
        setHasActiveOrder(false);
      }
    };

    checkAuth();

    const fetchRestaurants = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Détecter Capacitor
        const isCapacitorApp = typeof window !== 'undefined' && 
          (window.location?.protocol === 'capacitor:' || 
           window.location?.href?.startsWith('capacitor://') ||
           window.Capacitor !== undefined);
        
        console.log('[Restaurants] Détection Capacitor:', {
          protocol: typeof window !== 'undefined' ? window.location?.protocol : 'N/A',
          href: typeof window !== 'undefined' ? window.location?.href : 'N/A',
          hasCapacitor: typeof window !== 'undefined' ? !!window.Capacitor : 'N/A',
          isCapacitorApp
        });
        
        let data;
        
        // Dans Capacitor, utiliser Supabase directement pour éviter les problèmes CORS
        if (isCapacitorApp) {
          console.log('[Restaurants] Mode Capacitor - Utilisation de Supabase directement');
          console.log('[Restaurants] URL Supabase:', process.env.NEXT_PUBLIC_SUPABASE_URL);
          console.log('[Restaurants] Supabase client (import):', !!supabase);
          console.log('[Restaurants] Supabase client (window):', !!(typeof window !== 'undefined' && window.supabase));
          
          // Utiliser window.supabase si disponible (initialisé dans layout.js), sinon utiliser l'import
          const supabaseClient = (typeof window !== 'undefined' && window.supabase) || supabase;
          
          // Vérifier que Supabase est bien initialisé
          if (!supabaseClient) {
            console.error('[Restaurants] Supabase client non disponible');
            throw new Error('Supabase client non initialisé');
          }
          
          console.log('[Restaurants] Utilisation du client Supabase:', supabaseClient ? 'OK' : 'ERREUR');
          
          // Récupérer les restaurants depuis Supabase
          console.log('[Restaurants] Début requête Supabase...');
          const { data: restaurants, error: supabaseError } = await supabaseClient
            .from('restaurants')
            // IMPORTANT: `horaires` est requis pour calculer ouvert/fermé correctement.
            .select('*, frais_livraison, ferme_manuellement, ouvert_manuellement, horaires');
          
          console.log('[Restaurants] Requête Supabase terminée');
          console.log('[Restaurants] Résultat Supabase:', {
            hasData: !!restaurants,
            dataLength: restaurants?.length || 0,
            hasError: !!supabaseError,
            error: supabaseError
          });
          
          if (supabaseError) {
            console.error('[Restaurants] Erreur Supabase complète:', supabaseError);
            console.error('[Restaurants] Code erreur:', supabaseError.code);
            console.error('[Restaurants] Message erreur:', supabaseError.message);
            console.error('[Restaurants] Détails erreur:', supabaseError.details);
            console.error('[Restaurants] Hint erreur:', supabaseError.hint);
            throw new Error(`Erreur Supabase: ${supabaseError.message || 'Erreur inconnue'}`);
          }
          
          if (!restaurants || restaurants.length === 0) {
            console.warn('[Restaurants] Aucun restaurant retourné par Supabase');
            console.warn('[Restaurants] Vérifiez les permissions RLS sur la table restaurants');
            setRestaurants([]);
            setRestaurantsOpenStatus({});
            setLoading(false);
            return;
          }
          
          console.log('[Restaurants] Restaurants récupérés:', restaurants.length);
          
          // Calculer les notes depuis les avis pour chaque restaurant
          const restaurantsWithRatings = await Promise.all((restaurants || []).map(async (restaurant) => {
            const { data: reviews } = await supabaseClient
              .from('reviews')
              .select('rating')
              .eq('restaurant_id', restaurant.id);
            
            let calculatedRating = 0;
            let reviewsCount = 0;
            if (reviews && reviews.length > 0) {
              const totalRating = reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
              calculatedRating = Math.round((totalRating / reviews.length) * 10) / 10;
              reviewsCount = reviews.length;
            }
            
            return {
              ...restaurant,
              rating: calculatedRating || restaurant.rating || 0,
              reviews_count: reviewsCount || restaurant.reviews_count || 0
            };
          }));
          
          data = restaurantsWithRatings;
          console.log('[Restaurants] Restaurants récupérés depuis Supabase:', data.length);
        } else {
          // Sur le web, utiliser l'API Next.js
          console.log('[Restaurants] Mode Web - Utilisation de l\'API Next.js');
          
          const response = await fetch(`/api/restaurants?t=${Date.now()}&r=${Math.random().toString(36).slice(2)}`, {
            cache: 'no-store',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });
          
          console.log('[Restaurants] Réponse reçue:', {
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            url: response.url
          });
          
          if (!response.ok) {
            let errorData;
            try {
              errorData = await response.json();
            } catch (e) {
              errorData = { message: `Erreur ${response.status}: ${response.statusText}` };
            }
            const errorMessage = errorData.message || errorData.error || `Erreur ${response.status}: ${response.statusText}`;
            console.error('[Restaurants] Erreur API:', errorMessage, errorData);
            throw new Error(errorMessage);
          }
          
          // Parser le JSON avec gestion d'erreur
          try {
            const text = await response.text();
            console.log('[Restaurants] Réponse texte (premiers 200 caractères):', text.substring(0, 200));
            data = JSON.parse(text);
          } catch (parseError) {
            console.error('[Restaurants] Erreur parsing JSON:', parseError);
            throw new Error(`Erreur lors du parsing de la réponse JSON: ${parseError.message}`);
          }
        }
        
        console.log('[Restaurants] Données parsées:', {
          type: Array.isArray(data) ? 'array' : typeof data,
          length: Array.isArray(data) ? data.length : 'N/A'
        });
        
        if (!Array.isArray(data)) {
          console.error('[Restaurants] Format de données invalide:', typeof data, data);
          throw new Error('Format de données invalide: la réponse n\'est pas un tableau');
        }
        
        console.log('[Restaurants] Nombre de restaurants reçus:', data.length);
        
        if (data.length === 0) {
          console.warn('[Restaurants] Aucun restaurant trouvé dans la réponse');
          setRestaurants([]);
          setRestaurantsOpenStatus({});
          setLoading(false);
          return;
        }
        
        // Normaliser les restaurants avec gestion d'erreur pour chaque restaurant
        const normalizedRestaurants = [];
        console.log('[Restaurants] Début normalisation de', data.length, 'restaurants');
        for (const restaurant of data) {
          try {
            // Vérifier que le restaurant a au moins un nom
            if (!restaurant || !restaurant.nom) {
              console.warn('[Restaurants] Restaurant ignoré (pas de nom):', restaurant?.id);
              continue;
            }
            
            const normalized = normalizeName(restaurant.nom);
            if (!normalized || normalized === '.') {
              console.warn('[Restaurants] Restaurant ignoré (nom invalide):', restaurant.nom);
              continue;
            }
            
            console.log('[Restaurants] Normalisation OK pour:', restaurant.nom);
            
            const primaryImage =
              restaurant.profile_image ||
              restaurant.image_url ||
              restaurant.logo_image ||
              restaurant.profileImage ||
              restaurant.imageUrl;

            const bannerImage =
              restaurant.banner_image ||
              restaurant.bannerImage ||
              restaurant.cover_image ||
              restaurant.banniere_image;

            const logoImage =
              restaurant.logo_image ||
              restaurant.logoImage ||
              restaurant.profile_image ||
              restaurant.profileImage;

            let categoryTokens = [];
            let todayHoursLabel = null;
            
            try {
              categoryTokens = getCategoryTokensForRestaurant(restaurant);
            } catch (e) {
              console.warn('[Restaurants] Erreur getCategoryTokensForRestaurant:', e);
            }
            
            try {
              todayHoursLabel = getTodayHoursLabel(restaurant);
            } catch (e) {
              console.warn('[Restaurants] Erreur getTodayHoursLabel:', e);
            }

            // S'assurer que ferme_manuellement, ouvert_manuellement et offre (promo) sont bien préservés
            const normalizedRestaurant = {
              ...restaurant,
              image_url: primaryImage,
              banner_image: bannerImage,
              logo_image: logoImage,
              cuisine_type: restaurant.cuisine_type || restaurant.type_cuisine || restaurant.type || restaurant.category,
              category: restaurant.category || restaurant.categorie,
              category_tokens: categoryTokens,
              today_hours_label: todayHoursLabel,
              ferme_manuellement: restaurant.ferme_manuellement,
              ouvert_manuellement: restaurant.ouvert_manuellement,
              // Badge promo : partenaires avec promo activée (La Bonne Pâte exclue définitivement)
              ...(function () {
                const isLaBonnePate = restaurant.nom && (String(restaurant.nom).toLowerCase().includes('bonne pâte') || String(restaurant.nom).toLowerCase().includes('bonne pate'));
                const offreActive = isLaBonnePate ? false : (restaurant.offre_active === true || restaurant.offre_active === 1 || (typeof restaurant.offre_active === 'string' && restaurant.offre_active.trim().toLowerCase() === 'true'));
                return {
                  offre_active: offreActive,
                  offre_label: isLaBonnePate ? null : (restaurant.offre_label ?? null),
                  offre_description: isLaBonnePate ? null : (restaurant.offre_description ?? null)
                };
              })()
            };
            
            // Log pour "Le O Saona Tea" spécifiquement
            if (normalized.includes('saona') || normalized.includes('o saona')) {
              console.log(`[Restaurants] ${restaurant.nom} - Données normalisées:`, {
                ferme_manuellement: normalizedRestaurant.ferme_manuellement,
                ferme_manuellement_type: typeof normalizedRestaurant.ferme_manuellement,
                ferme_manuellement_strict_false: normalizedRestaurant.ferme_manuellement === false,
                original_ferme_manuellement: restaurant.ferme_manuellement
              });
            }
            
            // Log spécial pour "La Bonne Pâte" pour debug
            if (restaurant.nom && (restaurant.nom.toLowerCase().includes('bonne pâte') || restaurant.nom.toLowerCase().includes('bonne pate'))) {
              console.log(`[Restaurants] 🔍 DEBUG SPÉCIAL "La Bonne Pâte" - Normalisation:`, {
                nom: restaurant.nom,
                original_ferme_manuellement: restaurant.ferme_manuellement,
                original_type: typeof restaurant.ferme_manuellement,
                normalized_ferme_manuellement: normalizedRestaurant.ferme_manuellement,
                normalized_type: typeof normalizedRestaurant.ferme_manuellement,
                strict_true: normalizedRestaurant.ferme_manuellement === true,
                strict_false: normalizedRestaurant.ferme_manuellement === false
              });
            }
            
            normalizedRestaurants.push(normalizedRestaurant);
          } catch (restaurantError) {
            console.error('[Restaurants] Erreur normalisation restaurant:', restaurantError, restaurant);
            // Continuer avec les autres restaurants même si un échoue
          }
        }

        console.log('[Restaurants] Restaurants normalisés:', normalizedRestaurants.length, 'sur', data.length, 'reçus');
        if (normalizedRestaurants.length === 0 && data.length > 0) {
          console.error('[Restaurants] ⚠️ PROBLÈME: Aucun restaurant normalisé alors que', data.length, 'ont été reçus !');
          console.error('[Restaurants] Premier restaurant reçu:', data[0]);
        }
        // IMPORTANT:
        // En prod, on observe parfois un écart entre /api/restaurants (liste) et /api/restaurants/:id
        // sur ferme_manuellement / ouvert_manuellement / is_open_now.
        // On resynchronise donc chaque carte avec l'endpoint détail (source la plus fiable observée).
        let syncedRestaurants = normalizedRestaurants;
        let detailIdSet = new Set();
        try {
          const detailRows = await Promise.all(
            normalizedRestaurants.map(async (r) => {
              try {
                const res = await fetch(`/api/restaurants/${r.id}?t=${Date.now()}`, { cache: 'no-store' });
                if (!res.ok) return null;
                return await res.json();
              } catch {
                return null;
              }
            })
          );
          const byId = new Map(detailRows.filter(Boolean).map((r) => [r.id, r]));
          detailIdSet = new Set(byId.keys());
          syncedRestaurants = normalizedRestaurants.map((r) => {
            const d = byId.get(r.id);
            if (!d) return r;
            return {
              ...r,
              ferme_manuellement: d.ferme_manuellement,
              ouvert_manuellement: d.ouvert_manuellement,
              is_open_now: d.is_open_now
            };
          });
        } catch (e) {
          console.warn('[Restaurants] Sync détail indisponible, on garde la liste brute:', e);
        }

        setRestaurants(syncedRestaurants);

        // Statut ouvert/fermé: uniquement à partir du détail (api/restaurants/:id).
        // Si le détail manque pour une carte, on garde le statut précédent pour éviter "ouvert/fermé" alterné.
        const toBool = (v) =>
          v === true ||
          v === 1 ||
          (typeof v === 'string' && v.trim().toLowerCase() === 'true');

        const syncedById = new Map((syncedRestaurants || []).map((r) => [r.id, r]));
        const openStatusMap = { ...(openStatusRef.current || {}) };
        for (const restaurant of normalizedRestaurants) {
          // Ne met à jour la carte que si le détail a été récupéré pour ce restaurant.
          // Sinon, on garde le statut précédent pour éviter les bascules.
          if (!detailIdSet.has(restaurant.id)) continue;

          const synced = syncedById.get(restaurant.id);
          if (!synced) continue;

          const fm = toBool(synced.ferme_manuellement);
          const om = toBool(synced.ouvert_manuellement);

          // Priorité: ferme_manuellement => fermé, sinon ouvert_manuellement => ouvert, sinon is_open_now
          const isOpen = !fm && (om || toBool(synced.is_open_now));
          const todayHoursLabel = getTodayHoursLabel(restaurant) || restaurant.today_hours_label || null;

          openStatusMap[restaurant.id] = {
            isOpen,
            isManuallyClosed: fm,
            hoursLabel: todayHoursLabel || 'Horaires non communiquées',
          };
        }
        openStatusRef.current = openStatusMap;
        setRestaurantsOpenStatus(openStatusMap);
        console.log('[Restaurants] Chargement terminé avec succès:', normalizedRestaurants.length, 'restaurants');
      } catch (error) {
        console.error('[Restaurants] Erreur lors du chargement des restaurants:', error);
        console.error('[Restaurants] Stack trace:', error.stack);
        const errorMessage = error.message || error.toString() || 'Erreur inconnue';
        setError(`Erreur lors du chargement des restaurants: ${errorMessage}`);
        setRestaurants([]);
        setRestaurantsOpenStatus({});
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
    
    // Écouter l'événement de changement de statut restaurant pour rafraîchir les données
    const handleRestaurantStatusChange = () => {
      console.log('[Restaurants] Événement restaurant-status-changed détecté, rafraîchissement des restaurants...');
      fetchRestaurants();
    };
    
    window.addEventListener('restaurant-status-changed', handleRestaurantStatusChange);

    // Support multi-onglets / mobile : BroadcastChannel
    let bc;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('cvneat_restaurant_status');
        bc.onmessage = (ev) => {
          if (ev?.data?.type === 'restaurant-status-changed') {
            console.log('[Restaurants] BroadcastChannel status change, rafraîchissement...');
            fetchRestaurants();
          }
        };
      }
    } catch (e) {
      // ignore
    }
    
    // Rafraîchir dès que l’utilisateur revient sur l’onglet (fermeture manuelle dans l’autre onglet)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchRestaurants();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    
    const onWindowFocus = () => {
      if (pathname === '/') fetchRestaurants();
    };
    window.addEventListener('focus', onWindowFocus);
    
    const refreshInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchRestaurants();
      }
    }, 60000);
    
    return () => {
      window.removeEventListener('restaurant-status-changed', handleRestaurantStatusChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onWindowFocus);
      clearInterval(refreshInterval);
      try { bc?.close?.(); } catch { /* ignore */ }
    };
  }, [pathname]);

  const handleToggleFavorite = (restaurant) => {
    const currentFavorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    let newFavorites;
    
    if (favorites.includes(restaurant.id)) {
      // Retirer des favoris
      newFavorites = currentFavorites.filter(id => id !== restaurant.id);
    } else {
      // Ajouter aux favoris
      newFavorites = [...currentFavorites, restaurant.id];
    }
    
    // Mettre à jour localStorage et l'état local
    localStorage.setItem('favorites', JSON.stringify(newFavorites));
    setFavorites(newFavorites);
    
    console.log('Favoris mis à jour:', newFavorites);
  };

  const handleAddToCart = (restaurant) => {
    // Animation d'ajout au panier
    setAddingToCart(prev => ({ ...prev, [restaurant.id]: true }));
    
    // Ajouter au panier (logique simplifiée pour l'instant)
    const newCartItem = {
      id: restaurant.id,
      nom: restaurant.nom,
      prix: 15.00, // Prix par défaut
      quantity: 1,
      restaurant_id: restaurant.id,
      restaurant_name: restaurant.nom,
      image_url: restaurant.image_url || restaurant.imageUrl
    };
    
    setCart(prev => [...prev, newCartItem]);
    
    // Notification de succès
    setShowCartNotification(true);
    setTimeout(() => setShowCartNotification(false), 2000);
    
    // Arrêter l'animation après un délai
    setTimeout(() => {
      setAddingToCart(prev => ({ ...prev, [restaurant.id]: false }));
    }, 500);
  };

  const handleRestaurantClick = (restaurant) => {
    // IMPORTANT: dans l'app mobile (export statique), éviter /restaurants/[id]
    // car le fallback HTML peut créer un refresh en boucle.
    // On utilise une route statique /restaurant-view?id=...
    if (typeof window !== 'undefined') {
      const targetUrl = `/restaurant-view?id=${encodeURIComponent(restaurant.id)}`;
      console.log('[Navigation] Redirection vers restaurant:', targetUrl, 'ID:', restaurant.id);
      
      // Dans l'app mobile Capacitor, forcer la navigation avec un rechargement complet
      const isCapacitorApp = window.location.protocol === 'capacitor:' || 
                            window.location.href.indexOf('capacitor://') === 0 ||
                            window.Capacitor !== undefined;
      
      // Sur web/app: route statique, donc router.push suffit.
      // (Sur Capacitor, c'est aussi plus stable que window.location.href)
      router.push(targetUrl);
    } else {
      // Fallback pour SSR
      router.push(`/restaurant-view?id=${encodeURIComponent(restaurant.id)}`);
    }
  };

    const filteredAndSortedRestaurants = restaurants.filter(restaurant => {
    if (restaurant.is_active === false || restaurant.active === false || restaurant.status === 'inactive') {
      return false;
    }
    if (restaurant.ferme_definitivement) {
      return false;
    }
    // Ne plus filtrer les restaurants fermés manuellement - ils doivent tous être visibles avec un badge "Fermé"
    
    // Filtre par catégorie
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'offres') {
        if (restaurant.offre_active !== true) return false;
      } else {
      const restaurantTokens = restaurant.category_tokens || [];

      const categoryMap = {
        'pizza': ['pizza', 'italien', 'italian', 'pizzeria'],
        'burger': ['burger', 'hamburger', 'fast food', 'fast-food', 'sandwich'],
        'coffee': ['café', 'coffee', 'cafe', 'boulangerie', 'bakery', 'boulanger'],
        'dessert': ['dessert', 'patisserie', 'pâtisserie', 'glace', 'ice cream', 'sucré'],
        'healthy': ['healthy', 'salade', 'salad', 'bio', 'organic', 'végétarien', 'vegan'],
        'fast': ['fast food', 'fast-food', 'restaurant rapide', 'quick', 'snack'],
        'traditional': [
          'traditionnel',
          'traditionnelle',
          'tradition',
          'cuisine familiale',
          'fait maison',
          'terroir',
          'brasserie',
          'bistrot',
          'bistro',
          'français',
          'francaise',
          'française'
        ]
      };
      
      const validCategories = categoryMap[selectedCategory] || [];
      const matchesCategory = validCategories.some((cat) =>
        restaurantTokens.some((token) => token.includes(normalizeToken(cat)))
      );
      if (!matchesCategory) return false;
      }
    }
    
    // Filtre par recherche textuelle
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        restaurant.nom?.toLowerCase().includes(searchLower) ||
        restaurant.description?.toLowerCase().includes(searchLower) ||
        restaurant.cuisine_type?.toLowerCase().includes(searchLower) ||
        restaurant.category?.toLowerCase().includes(searchLower) ||
        restaurant.adresse?.toLowerCase().includes(searchLower) ||
        restaurant.ville?.toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;
    }
    
    return true;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        return (b.rating || 0) - (a.rating || 0);
      case 'delivery_time':
        // Trier par temps de préparation déclaré (ce qui est affiché aux clients)
        // Les restaurants sans valeur passent à la fin
        return ((a.prep_time_minutes ?? 9999) - (b.prep_time_minutes ?? 9999));
      case 'distance':
        return (a.distance || 0) - (b.distance || 0);
      default:
        return 0;
    }
  });

  const fallbackReadyRestaurants = useMemo(() => [], [restaurants]);

  const finalRestaurants = filteredAndSortedRestaurants.length > 0
    ? filteredAndSortedRestaurants
    : fallbackReadyRestaurants;

  const displayRestaurants = useMemo(() => {
    const seen = new Set();
    const uniqueRestaurants = finalRestaurants.filter((restaurant) => {
      const key = normalizeName(restaurant.nom) || restaurant.id;
      if (seen.has(key)) return false;
      if (RESTAURANTS_MASQUES.has(key)) return false;
      if (RESTAURANTS_MASQUES_CONTIENT.some((mot) => key.includes(mot))) return false;
      seen.add(key);
      return true;
    });

    const boostOrder = (restaurant) => {
      const normalized = normalizeName(restaurant.nom);
      
      // Restaurants prioritaires (partagent activement CVN'EAT)
      if (normalized.includes('la bonne pate') || normalized.includes('la bonne pâte')) return 0; // 1er
      if (normalized.includes('99 street food') || normalized.includes('99street')) return 1; // 2ème
      if (normalized.includes('cinq pizza') || normalized.includes('le cinq pizza')) return 2; // 3ème
      if (normalized.includes('assiette des saison') || normalized.includes('assiette des saisons')) return 3;
      if (normalized.includes('smaash')) return 4;
      
      // Restaurants pénalisés (ne partagent jamais CVN'EAT)
      if (normalized.includes('all\'ovale') || normalized.includes('all ovale') || normalized.includes('allovale')) return 997; // Toujours en bas
      if (normalized.includes('burger cevenol') || normalized.includes('burger cévenol') || normalized.includes('burgercevenol')) return 996; // Presque toujours en bas
      
      if (normalized.includes('dolce vita')) return 1000; // Dernier
      
      // Autres restaurants = ordre normal (5+)
      return 5;
    };

    return uniqueRestaurants.sort((a, b) => {
      const statusA = restaurantsOpenStatus[a.id] || {};
      const statusB = restaurantsOpenStatus[b.id] || {};
      const isOpenA = statusA.isOpen === true && statusA.isManuallyClosed !== true;
      const isOpenB = statusB.isOpen === true && statusB.isManuallyClosed !== true;

      // Calculer le boostOrder pour chaque restaurant
      const boostA = boostOrder(a);
      const boostB = boostOrder(b);

      // Priorité 1 : Si l'un est ouvert et l'autre fermé, l'ouvert passe devant
      // EXCEPTION : Si les deux sont prioritaires (boostOrder < 5), on respecte le boostOrder même si l'un est fermé
      // Cela permet à La Bonne Pâte (boostOrder 0) de rester en haut même fermée par rapport aux autres prioritaires
      
      if (isOpenA !== isOpenB) {
        // Si les deux sont prioritaires (boostOrder < 5), celui qui est ouvert passe devant
        if (boostA < 5 && boostB < 5) {
          return isOpenA ? -1 : 1;
        }
        
        // Si un prioritaire (boostOrder < 5) est fermé et l'autre est un restaurant normal (boostOrder >= 5) ouvert
        // Le restaurant normal ouvert passe devant le prioritaire fermé
        if (boostA < 5 && !isOpenA && isOpenB && boostB >= 5) {
          return 1; // Normal ouvert passe devant prioritaire fermé
        }
        if (boostB < 5 && !isOpenB && isOpenA && boostA >= 5) {
          return -1; // Normal ouvert passe devant prioritaire fermé
        }
        
        // Pour tous les autres cas, l'ouvert passe devant le fermé
        return isOpenA ? -1 : 1;
      }

      // Priorité 2 : Même statut ouvert/fermé, on respecte le boostOrder (partage réseaux sociaux)
      // Les restaurants qui partagent le plus passent devant
      return boostA - boostB;
    });
  }, [finalRestaurants, restaurantsOpenStatus]);

  // Détecter si on est sur une route de restaurant AVANT de charger quoi que ce soit
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const restaurantMatch = path.match(/\/restaurants\/([^\/\?]+)/);
      
      if (restaurantMatch && restaurantMatch[1]) {
        console.log('[Home] 🔍 Route restaurant détectée, NE PAS charger la page d\'accueil');
        setIsRestaurantRoute(true);
        // Ne rien faire, laisser le script de routage dans le HTML gérer
        return;
      }
    }
  }, []);

  if (!isClient) {
    return null;
  }
  
  // Si on est sur une route restaurant, charger directement le composant RestaurantDetail
  if (isRestaurantRoute) {
    console.log('[Home] ✅ Chargement du composant RestaurantDetailLoader');
    const RestaurantDetailLoader = dynamic(() => import('./components/RestaurantDetailLoader'), {
      ssr: false,
      loading: () => (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement du restaurant...</p>
          </div>
        </div>
      )
    });
    return <RestaurantDetailLoader />;
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-gray-900">
      {/* Bannière Livraison Offerte */}
      <FreeDeliveryBanner />
      
      {/* Hero Section avec carrousel visuel */}
      <section className="relative h-[420px] sm:h-[520px] md:h-[620px] overflow-hidden">
        {heroSlides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-[1200ms] ease-out ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`}
          >
            {slide.image ? (
              <Image
                src={slide.image}
                alt={slide.title}
                fill
                className="object-cover"
                priority={index === 0}
                unoptimized
                sizes="100vw"
              />
            ) : (
              <div className={`absolute inset-0 bg-gradient-to-br ${slide.gradient || 'from-orange-500 to-red-600'}`} />
            )}
            <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-black/30 to-black/20" />
          </div>
        ))}
        
        {/* Logo CVN'EAT en haut à gauche - Optimisé mobile */}
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 md:top-4 md:left-4 z-20">
          <div className="flex items-center space-x-1.5 sm:space-x-2 md:space-x-3">
            <div className="relative">
              <div className="w-7 h-7 sm:w-9 sm:h-9 md:w-12 md:h-12 bg-gradient-to-br from-orange-500 via-red-500 to-orange-600 rounded-xl flex items-center justify-center shadow-2xl transform rotate-3 hover:rotate-0 hover:scale-110 transition-all duration-300 hover:shadow-orange-500/50">
                <div className="w-4 h-4 sm:w-6 sm:h-6 md:w-8 md:h-8 bg-white rounded-lg flex items-center justify-center">
                  <FaUtensils className="h-2.5 w-2.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-orange-600" />
                </div>
              </div>
              <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 md:-top-1 md:-right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-5 md:h-5 bg-green-500 rounded-full border-2 border-white shadow-md animate-pulse"></div>
              <div className="absolute -bottom-0.5 -left-0.5 sm:-bottom-1 sm:-left-1 md:-bottom-1 md:-left-1 w-1.5 h-1.5 sm:w-2 sm:h-2 md:w-3 md:h-3 bg-yellow-400 rounded-full border-1.5 sm:border-2 border-white"></div>
            </div>
            <div className="flex flex-col">
              <span className="text-base sm:text-xl md:text-2xl font-black bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 bg-clip-text text-transparent tracking-tight leading-tight drop-shadow-lg animate-pulse">
                CVN'EAT
              </span>
              <span className="text-[10px] sm:text-xs text-gray-300 -mt-0.5 sm:-mt-1 font-medium hidden sm:block">Excellence culinaire</span>
            </div>
          </div>
        </div>
        
          {/* Actions utilisateur en haut à droite - Design compact avec icônes - Optimisé mobile */}
        {/* Sur mobile, la navigation passe par la barre d'onglets en bas.
            On garde les raccourcis (Partenaire/Livreur/Pub/Ma commande) uniquement sur sm+ */}
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 md:top-4 md:right-4 z-20 hidden sm:flex items-center flex-wrap gap-1 sm:gap-1.5 md:gap-2 max-w-[calc(100vw-5rem)] sm:max-w-none">
          {/* Bouton Devenir Partenaire */}
          <Link href="/restaurant-request" className="bg-blue-600/90 backdrop-blur-sm px-2 sm:px-2.5 md:px-3 py-1.5 sm:py-2 rounded-full text-white hover:bg-blue-700 transition-all duration-200 flex items-center space-x-1 sm:space-x-1.5 text-[10px] sm:text-xs md:text-sm font-medium shadow-md hover:shadow-lg transform hover:scale-105 min-h-[36px] sm:min-h-[38px] md:min-h-[40px] touch-manipulation">
            <FaStore className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Partenaire</span>
          </Link>
          {/* Bouton Devenir Livreur */}
          <Link href="/become-delivery" className="bg-green-600/90 backdrop-blur-sm px-2 sm:px-2.5 md:px-3 py-1.5 sm:py-2 rounded-full text-white hover:bg-green-700 transition-all duration-200 flex items-center space-x-1 sm:space-x-1.5 text-[10px] sm:text-xs md:text-sm font-medium shadow-md hover:shadow-lg transform hover:scale-105 min-h-[36px] sm:min-h-[38px] md:min-h-[40px] touch-manipulation">
            <FaMotorcycle className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Livreur</span>
          </Link>
          {/* Bouton Publicité */}
          <Link href="/advertise" className="bg-purple-600/90 backdrop-blur-sm px-2 sm:px-2.5 md:px-3 py-1.5 sm:py-2 rounded-full text-white hover:bg-purple-700 transition-all duration-200 flex items-center space-x-1 sm:space-x-1.5 text-[10px] sm:text-xs md:text-sm font-medium shadow-md hover:shadow-lg transform hover:scale-105 min-h-[36px] sm:min-h-[38px] md:min-h-[40px] touch-manipulation">
            <FaImage className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Pub</span>
          </Link>
          {/* Bouton Suivre ma commande - mis en avant si commande active */}
          <Link
            href="/track-order"
            className={`px-2 sm:px-2.5 md:px-3 py-1.5 sm:py-2 rounded-full transition-all duration-200 flex items-center space-x-1 sm:space-x-1.5 text-[10px] sm:text-xs md:text-sm font-medium shadow-md hover:shadow-lg transform hover:scale-105 min-h-[36px] sm:min-h-[38px] md:min-h-[40px] touch-manipulation ${
              hasActiveOrder
                ? 'bg-green-500 hover:bg-green-600 text-white ring-2 ring-white/50'
                : 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30'
            }`}
          >
            <FaTruck className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 flex-shrink-0" />
            <span className="hidden sm:inline">{hasActiveOrder ? 'Ma commande en cours' : 'Ma commande'}</span>
          </Link>
          
          {user ? (
            <>
              {/* Points de fidélité - Compact, cliquable */}
              <Link
                href="/profile?tab=loyalty"
                className="hidden sm:flex items-center space-x-1 bg-white/20 backdrop-blur-sm px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-full shadow-md min-h-[36px] sm:min-h-[38px] md:min-h-[40px] hover:bg-white/30 transition-colors"
                title="Voir mes points de fidélité"
              >
                <FaGift className="text-yellow-400 h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 flex-shrink-0" />
                <span className="text-white text-[10px] sm:text-xs md:text-sm font-semibold">{userPoints}</span>
              </Link>
              
              {/* Profil - Icône seule */}
              <Link href="/profile" className="hidden sm:flex bg-white/20 backdrop-blur-sm p-1.5 sm:p-2 rounded-full hover:bg-white/30 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 min-h-[36px] sm:min-h-[38px] md:min-h-[40px] min-w-[36px] sm:min-w-[38px] md:min-w-[40px] items-center justify-center touch-manipulation">
                <FaUser className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-4 md:w-4 text-white" />
              </Link>
              
              {/* Déconnexion - Icône seule */}
              <button
                onClick={handleLogout}
                className="hidden sm:flex bg-white/20 backdrop-blur-sm p-1.5 sm:p-2 rounded-full text-white hover:bg-red-500/30 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 min-h-[36px] sm:min-h-[38px] md:min-h-[40px] min-w-[36px] sm:min-w-[38px] md:min-w-[40px] items-center justify-center touch-manipulation"
                title="Déconnexion"
              >
                <FaSignOutAlt className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-4 md:w-4" />
              </button>
            </>
          ) : (
            <>
              {/* Connexion - Icône seule */}
              <Link href="/login" className="hidden sm:flex bg-white/20 backdrop-blur-sm p-1.5 sm:p-2 rounded-full text-white hover:bg-white/30 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 min-h-[36px] sm:min-h-[38px] md:min-h-[40px] min-w-[36px] sm:min-w-[38px] md:min-w-[40px] items-center justify-center touch-manipulation" title="Connexion">
                <FaSignInAlt className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-4 md:w-4" />
              </Link>
              
              {/* Inscription - Icône seule */}
              <Link href="/register" className="hidden sm:flex bg-white/20 backdrop-blur-sm p-1.5 sm:p-2 rounded-full text-white hover:bg-white/30 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 min-h-[36px] sm:min-h-[38px] md:min-h-[40px] min-w-[36px] sm:min-w-[38px] md:min-w-[40px] items-center justify-center touch-manipulation" title="Inscription">
                <FaUserPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-4 md:w-4" />
              </Link>
            </>
          )}
          
          {/* Panier flottant - Icône avec badge */}
          {cart.length > 0 && (
            <button
              onClick={() => setShowFloatingCart(!showFloatingCart)}
              className="hidden sm:flex relative bg-white/20 backdrop-blur-sm p-1.5 sm:p-2 rounded-full hover:bg-white/30 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 min-h-[36px] sm:min-h-[38px] md:min-h-[40px] min-w-[36px] sm:min-w-[38px] md:min-w-[40px] items-center justify-center touch-manipulation"
            >
              <FaShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-4 md:w-4 text-white" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] sm:text-xs rounded-full h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5 flex items-center justify-center font-bold shadow-sm">
                {cart.length}
              </span>
            </button>
          )}
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 h-full flex items-center">
          <div className="text-white max-w-2xl w-full">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-7xl font-bold mb-3 sm:mb-4 md:mb-6 leading-tight">
              {heroSlides[currentSlide]?.title}
            </h1>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl mb-4 sm:mb-5 md:mb-6 lg:mb-8 text-gray-200">
              {heroSlides[currentSlide]?.subtitle}
            </p>

            {/* Barre de recherche intégrée - Optimisée mobile */}
            <div className="bg-white rounded-xl p-3 sm:p-4 shadow-lg max-w-full sm:max-w-lg">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <FaSearch className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Nom du restaurant, cuisine, plat..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 border-none outline-none text-gray-900 placeholder-gray-500 text-sm sm:text-base min-h-[44px] touch-manipulation"
                />
              </div>
            </div>

            {/* CTA clair sur mobile (au lieu des icônes en haut à droite) */}
            <div className="mt-3 sm:hidden">
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/track-order"
                  className="inline-flex items-center justify-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-white hover:bg-white/30 transition-all duration-200 text-sm font-semibold shadow-md min-h-[44px] touch-manipulation"
                >
                  <FaTruck className="h-4 w-4" />
                  <span>Suivre ma commande</span>
                </Link>

                <Link
                  href="/restaurant-request"
                  className="inline-flex items-center justify-center gap-2 bg-blue-600/90 backdrop-blur-sm px-4 py-2 rounded-full text-white hover:bg-blue-700 transition-all duration-200 text-sm font-semibold shadow-md min-h-[44px] touch-manipulation"
                >
                  <FaStore className="h-4 w-4" />
                  <span>Devenir partenaire</span>
                </Link>

                <Link
                  href="/become-delivery"
                  className="inline-flex items-center justify-center gap-2 bg-green-600/90 backdrop-blur-sm px-4 py-2 rounded-full text-white hover:bg-green-700 transition-all duration-200 text-sm font-semibold shadow-md min-h-[44px] touch-manipulation"
                >
                  <FaMotorcycle className="h-4 w-4" />
                  <span>Devenir livreur</span>
                </Link>
              </div>
            </div>

          </div>
        </div>

        {/* Indicateurs du carrousel */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center space-x-2 z-20">
          {heroSlides.map((slide, index) => (
            <button
              key={slide.id}
              aria-label={`Aller au slide ${index + 1}`}
              onClick={() => setCurrentSlide(index)}
              className={`w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 rounded-full transition-all ${index === currentSlide ? 'bg-white scale-110' : 'bg-white/40 hover:bg-white/70'}`}
            />
          ))}
        </div>
      </section>



      {/* Panier flottant - Optimisé mobile */}
      {showFloatingCart && cart.length > 0 && (
        <div className="fixed top-16 sm:top-24 right-2 sm:right-6 bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 z-50 w-[calc(100vw-1rem)] sm:w-80 sm:min-w-96 max-w-[calc(100vw-1rem)] sm:max-w-96">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Votre panier</h3>
            <button
              onClick={() => setShowFloatingCart(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2 -m-2 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <FaTimes className="h-5 w-5 sm:h-5 sm:w-5" />
            </button>
          </div>
          
          <div className="space-y-3 mb-6 max-h-80 overflow-y-auto">
            {cart.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 sm:p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <span className="flex-1 font-medium text-gray-800 dark:text-gray-200 text-sm sm:text-base pr-2">{item.nom}</span>
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <button className="w-10 h-10 sm:w-8 sm:h-8 bg-white dark:bg-gray-600 border-2 border-gray-200 dark:border-gray-600 rounded-full flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors touch-manipulation active:scale-95">
                    <FaMinus className="h-3 w-3 sm:h-3 sm:w-3 text-gray-600 dark:text-gray-200" />
                  </button>
                  <span className="w-8 sm:w-10 text-center font-semibold text-gray-900 dark:text-gray-200 text-sm sm:text-base">{item.quantity || 1}</span>
                  <button className="w-10 h-10 sm:w-8 sm:h-8 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full flex items-center justify-center hover:from-orange-600 hover:to-amber-600 transition-all duration-200 touch-manipulation active:scale-95">
                    <FaPlus className="h-3 w-3 sm:h-3 sm:w-3" />
                  </button>
                </div>
                <span className="font-bold text-base sm:text-lg text-gray-900 dark:text-gray-200 ml-2 sm:ml-4">{getItemLineTotal(item).toFixed(2)}€</span>
              </div>
            ))}
          </div>
          
          <div className="border-t border-gray-200 pt-4">
            <div className="flex justify-between mb-4">
              <span className="text-base sm:text-lg font-semibold text-gray-700">Total:</span>
              <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-orange-500 to-amber-600 bg-clip-text text-transparent">
                {computeCartTotalWithExtras(cart).toFixed(2)}€
              </span>
            </div>
            <Link
              href="/checkout"
              className="block w-full bg-gradient-to-r from-orange-500 to-amber-600 text-white text-center py-4 sm:py-4 px-6 rounded-2xl font-bold text-base sm:text-lg hover:from-orange-600 hover:to-amber-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 touch-manipulation active:scale-95 min-h-[52px] sm:min-h-[56px]"
            >
              Commander maintenant
            </Link>
          </div>
        </div>
      )}

      {/* Notification d'ajout au panier */}
      {showCartNotification && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-orange-500 to-amber-600 text-white px-6 py-3 rounded-2xl shadow-2xl z-50 animate-bounce">
          <div className="flex items-center space-x-2">
            <FaShoppingCart className="h-5 w-5" />
            <span className="font-semibold">Article ajouté au panier !</span>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Section des catégories style Uber Eats - Optimisé mobile */}
        <section className="mb-10">
          <div className="flex items-stretch space-x-2 sm:space-x-3 lg:space-x-4 overflow-x-auto pb-4 scrollbar-hide px-1">
            {categories.map((category) => {
              const Icon = category.icon;
              const isSelected = selectedCategory === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`relative flex-shrink-0 w-28 sm:w-32 md:w-36 h-24 sm:h-28 rounded-3xl transition-all duration-300 focus:outline-none group ${
                    isSelected ? 'scale-105 shadow-2xl' : 'hover:scale-105 hover:shadow-xl'
                  }`}
                >
                  <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${category.color} ${isSelected ? 'opacity-100 shadow-2xl' : 'opacity-85 group-hover:opacity-100 group-hover:shadow-xl'} transition-all duration-300`} />
                  <div className={`absolute inset-0 rounded-3xl border-2 ${isSelected ? 'border-white/80 shadow-inner' : 'border-white/30 group-hover:border-white/60'} transition-all duration-300`} />
                  {/* Effet de brillance au hover */}
                  {!isSelected && (
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 opacity-0 group-hover:opacity-100"></div>
                  )}
                  <div className="relative h-full w-full p-3 sm:p-4 flex flex-col justify-between text-left text-white">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-white/25 backdrop-blur-sm flex items-center justify-center shadow-md">
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div>
                      <p className="text-sm sm:text-lg font-bold leading-tight">{category.name}</p>
                      <p className="text-[10px] sm:text-xs text-white/85 mt-0.5">
                        {category.tagline}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Espace publicitaire géré par l'admin */}
        <section className="mb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Advertisement position="banner_middle" />
        </section>

        {/* Section des restaurants avec défilement vertical élégant */}
        <section className="mb-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 space-y-4 sm:space-y-0">
            <div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black bg-gradient-to-r from-orange-600 via-red-600 to-orange-700 bg-clip-text text-transparent mb-2">Restaurants populaires</h2>
            <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base font-medium">Découvrez les meilleurs restaurants de votre région</p>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 sm:gap-3 px-5 sm:px-6 py-3 sm:py-3.5 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-2xl hover:border-orange-400 dark:hover:border-orange-500 hover:shadow-xl hover:shadow-orange-500/20 hover:-translate-y-0.5 transition-all duration-300 text-sm sm:text-base font-bold min-h-[48px] sm:min-h-[52px] touch-manipulation active:scale-95"
            >
              <FaFilter className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span className="font-semibold">Filtres</span>
            </button>
          </div>

          {/* Bannière points de fidélité - visible pour les clients connectés */}
          {user && (
            <Link
              href="/profile"
              className="mb-6 block bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400 dark:from-amber-600 dark:via-yellow-600 dark:to-amber-600 rounded-2xl p-4 sm:p-5 shadow-lg border border-amber-200 dark:border-amber-700 hover:shadow-xl hover:scale-[1.01] transition-all duration-200"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/90 dark:bg-gray-900/50 rounded-full flex items-center justify-center">
                    <FaGift className="text-2xl sm:text-3xl text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-base sm:text-lg">Points de fidélité actifs</h3>
                    <p className="text-gray-800 dark:text-gray-200 text-sm sm:text-base">Gagnez 1 point par € et échangez-les contre un article offert, une réduction ou la livraison gratuite !</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">{userPoints}</span>
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">pts</span>
                </div>
              </div>
            </Link>
          )}

          {/* Filtres et tri - Optimisé mobile */}
          {showFilters && (
            <div className="bg-white rounded-3xl p-4 sm:p-6 mb-8 shadow-xl border border-gray-100">
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4 sm:gap-6 items-start sm:items-center">
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
                  <span className="text-gray-700 font-semibold text-sm sm:text-base">Trier par:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-4 py-3 sm:py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-all duration-200 text-sm sm:text-base min-h-[48px] sm:min-h-[44px] w-full sm:w-auto"
                  >
                    <option value="recommended">Recommandés</option>
                    <option value="rating">Mieux notés</option>
                    <option value="delivery_time">Plus rapides</option>
                    <option value="distance">Plus proches</option>
                  </select>
                </div>
                
                <div className="text-gray-600 text-sm sm:text-base bg-gray-100 px-4 py-3 sm:py-2 rounded-full font-medium min-h-[48px] sm:min-h-[44px] flex items-center justify-center">
                  {displayRestaurants.length} restaurant{displayRestaurants.length !== 1 ? 's' : ''} trouvé{displayRestaurants.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          )}

          {/* Liste verticale des restaurants avec espacement élégant */}
          {loading ? (
            <div className="space-y-8">
              {[...Array(4)].map((_, i) => (
                <RestaurantCardSkeleton key={i} />
              ))}
            </div>
          ) : displayRestaurants.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-32 h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-6xl">🔍</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Aucun restaurant trouvé</h3>
              <p className="text-gray-600 text-lg">Essayez de modifier vos critères de recherche</p>
            </div>
          ) : (
            <div className="space-y-8">
              {displayRestaurants.map((restaurant, index) => {
                // Statut affiché sur l'accueil = 100% manuel (source de vérité : flags DB)
                // Priorité : ferme_manuellement > ouvert_manuellement
                // IMPORTANT: éviter un recalcul local (peut diverger et provoquer des bascules).
                // On ne rend que la valeur issue de `restaurantsOpenStatus`.
                const status = restaurantsOpenStatus?.[restaurant.id] || { isOpen: false, isManuallyClosed: false };
                const restaurantStatus = {
                  isOpen: status.isOpen === true,
                  isManuallyClosed: status.isManuallyClosed === true,
                  hoursLabel: getTodayHoursLabel(restaurant) || restaurant.today_hours_label || 'Horaires non communiquées'
                };

                const normalizedName = normalizeName(restaurant.nom);
                const isReadyRestaurant = READY_RESTAURANTS.has(normalizedName);
                // Statut unique : fermé si ferme_manuellement OU hors horaires
                const isClosed = !restaurantStatus.isOpen || restaurantStatus.isManuallyClosed;
                // Cartes toujours accessibles (plus de grisage) : le client voit Ouvert/Fermé mais peut toujours ouvrir la page
                
                // Vérifier si le restaurant est en vacances ou non opérationnel
                // Utiliser normalizedName qui est déjà calculé plus haut
                const isEnVacances = RESTAURANTS_EN_VACANCES.has(normalizedName);
                const isNonOperationnel = RESTAURANTS_NON_OPERATIONNELS.has(normalizedName);
                
                // Debug pour vérifier les noms
                if (restaurant.nom && (restaurant.nom.toLowerCase().includes('cévenol') || restaurant.nom.toLowerCase().includes('cevenol'))) {
                  console.log(`[DEBUG Cévenol] Nom original: "${restaurant.nom}", Normalisé: "${normalizedName}", En vacances: ${isEnVacances}`);
                }
                
                // Calculer le label des horaires
                let displayHoursLabel;
                if (restaurantStatus.isManuallyClosed) {
                  // Si restaurant en vacances ou non opérationnel, afficher le message approprié
                  if (isEnVacances) {
                    displayHoursLabel = 'En congés';
                  } else if (isNonOperationnel) {
                    displayHoursLabel = 'Bientôt disponible';
                  } else {
                    // Si fermé manuellement, ne pas afficher "Ouvre à : [heure]" car nécessite ouverture manuelle
                    displayHoursLabel = 'Fermé';
                  }
                } else {
                  // Si le restaurant n'est pas ouvert maintenant mais qu'il ouvrira plus tard aujourd'hui
                  if (!restaurantStatus.isOpen && !restaurantStatus.isManuallyClosed) {
                    const nextOpening = getNextOpeningTime(restaurant);
                    if (nextOpening) {
                      if (nextOpening.day) {
                        // Si c'est un jour futur, afficher le nom du jour
                        displayHoursLabel = `Ouvre ${nextOpening.day} à : ${nextOpening.time}`;
                      } else {
                        // Si c'est aujourd'hui
                        displayHoursLabel = `Ouvre à : ${nextOpening.time}`;
                      }
                    } else {
                      // Sinon, fallback: essayer d'extraire une prochaine ouverture depuis le label du jour
                      const todayLabel = restaurantStatus.hoursLabel || getTodayHoursLabel(restaurant);
                      if (todayLabel && typeof todayLabel === 'string') {
                        const m = todayLabel.trim().match(/^(\d{1,2}(?:[:h])\d{2})\s*-\s*/i);
                        if (m && m[1]) {
                          displayHoursLabel = `Ouvre à : ${m[1].replace('h', ':')}`;
                        } else {
                          displayHoursLabel = todayLabel;
                        }
                      } else {
                        displayHoursLabel = 'Horaires non communiquées';
                      }
                    }
                  } else {
                    // Si ouvert (manuel), horaires du jour ou libellé clair
                    const todayLabel = restaurantStatus.hoursLabel || getTodayHoursLabel(restaurant);
                    displayHoursLabel = todayLabel || (restaurantStatus.isOpen ? 'Selon le partenaire' : 'Horaires non communiquées');
                  }
                }
                
                return (
                <div
                  key={restaurant.id}
                  className="group transform transition-all duration-300 cursor-pointer hover:scale-[1.02]"
                  onClick={() => handleRestaurantClick(restaurant)}
                >
                  <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl transition-all duration-500 overflow-hidden border-2 border-transparent hover:border-orange-200 dark:hover:border-orange-800 hover:shadow-2xl hover:shadow-orange-500/20 hover:-translate-y-1">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-0">
                      {/* Image du restaurant - Optimisé mobile */}
                      <div className="relative sm:col-span-1 overflow-hidden h-48 sm:h-56 md:h-64 lg:h-72">
                        <div className="relative h-full w-full">
                          <OptimizedRestaurantImage
                            restaurant={restaurant}
                            className="h-full w-full object-cover transition-all duration-300"
                            priority={false}
                            sizes="(max-width: 640px) 100vw, (max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          />
                        </div>
                        
                        {/* Overlay avec effet de brillance amélioré */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent group-hover:from-black/50 group-hover:via-black/10 group-hover:to-transparent z-0 transition-all duration-500"></div>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 z-10"></div>
                        
                        {/* Badges - Ouvert/Fermé toujours visible + promo etc. */}
                        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 md:top-4 md:left-4 flex flex-col space-y-1.5 sm:space-y-2 z-20">
                          {isClosed ? (
                            <span className="bg-red-600 text-white/95 px-2.5 py-1 sm:px-3 sm:py-1.5 md:px-3.5 md:py-1.5 rounded-full text-xs sm:text-sm font-semibold shadow-lg border border-white/40">
                              Fermé
                            </span>
                          ) : (
                            <span className="bg-green-600 text-white/95 px-2.5 py-1 sm:px-3 sm:py-1.5 md:px-3.5 md:py-1.5 rounded-full text-xs sm:text-sm font-semibold shadow-lg border border-white/40">
                              Ouvert
                            </span>
                          )}
                          {restaurant.offre_active === true && (
                            <span className="inline-flex items-center bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 text-white px-3 py-1.5 sm:px-4 sm:py-2 md:px-5 md:py-2.5 rounded-full text-xs sm:text-sm font-extrabold shadow-xl shadow-orange-500/40 ring-2 ring-white/50 animate-pulse">
                              🏷️ {restaurant.offre_label || 'Promo'}
                            </span>
                          )}
                          {restaurant.mise_en_avant && restaurant.mise_en_avant_fin && new Date(restaurant.mise_en_avant_fin) > new Date() && (
                            <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 text-white px-2.5 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2 rounded-full text-xs sm:text-sm font-bold shadow-lg backdrop-blur-sm border border-white/30 animate-pulse">
                              ⭐ Sponsorisé
                            </span>
                          )}
                          {favorites.includes(restaurant.id) && (
                            <span className="bg-gradient-to-r from-red-500 via-pink-500 to-red-500 text-white px-2.5 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2 rounded-full text-xs sm:text-sm font-bold shadow-lg backdrop-blur-sm border border-white/30">
                              ❤️ Favori
                            </span>
                          )}
                        </div>
                        
                        {/* Bouton favori */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(restaurant);
                          }}
                          className="absolute top-2 right-2 sm:top-3 sm:right-3 md:top-4 md:right-4 w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-all duration-200 group-hover:scale-110 touch-manipulation active:scale-95 z-20"
                        >
                          <FaHeart className={`w-4 h-4 sm:w-5 sm:h-5 ${favorites.includes(restaurant.id) ? 'text-red-500 fill-current' : 'text-gray-600'}`} />
                        </button>
                        
                        {/* Temps de livraison - Optimisé mobile avec glassmorphism */}
                        <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 md:bottom-4 md:left-4 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md px-2 py-1.5 sm:px-3 sm:py-2 rounded-xl shadow-xl border border-white/20 dark:border-gray-700/50 z-20 group-hover:bg-white dark:group-hover:bg-gray-900 transition-all duration-300">
                          <div className="flex flex-col">
                            <div className="flex items-center space-x-1 sm:space-x-1.5 md:space-x-2">
                              <FaClock className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 text-gray-600 flex-shrink-0" />
                              <span className="text-[10px] sm:text-xs md:text-sm font-semibold text-gray-800">
                                {displayHoursLabel}
                              </span>
                            </div>
                            {restaurantStatus.isOpen && Number.isFinite(parseInt(restaurant.prep_time_minutes, 10)) && (
                              <span className="text-[9px] sm:text-[10px] md:text-xs text-gray-500 mt-0.5">
                                Préparation ~{parseInt(restaurant.prep_time_minutes, 10)} min
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Contenu de la carte - Optimisé mobile avec plus d'espacement */}
                      <div className="sm:col-span-2 p-4 sm:p-6 md:p-8 lg:p-10 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between mb-2 sm:mb-3 md:mb-4 gap-2">
                            <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-900 dark:text-gray-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors flex-1 min-w-0 break-words font-display">
                              {restaurant.nom}
                            </h3>
                            <div className="flex items-center bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/40 dark:to-amber-900/40 px-2 sm:px-2.5 md:px-3 py-1 rounded-full flex-shrink-0 shadow-md border border-yellow-200/50 dark:border-yellow-700/50">
                              <FaStar className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 text-yellow-500 dark:text-yellow-400 mr-0.5 sm:mr-1 flex-shrink-0 drop-shadow-sm" />
                              <span className="text-[10px] sm:text-xs md:text-sm font-bold text-gray-800 dark:text-gray-200">
                                {(restaurant.reviews_count || 0) > 0 ? (restaurant.rating || 0).toFixed(1) : '—'}
                              </span>
                            </div>
                          </div>
                          
                          <p className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm md:text-base lg:text-lg leading-relaxed mb-4 sm:mb-5 md:mb-6 line-clamp-2 sm:line-clamp-3">
                            {restaurant.description}
                          </p>
                          
                          {/* Détails de la promo (partenaires qui ont activé une offre) */}
                          {restaurant.offre_active === true && (restaurant.offre_label || restaurant.offre_description) && (
                            <div className="mb-3 sm:mb-4 p-3 sm:p-3.5 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border border-orange-200/60 dark:border-orange-700/40">
                              <p className="text-xs sm:text-sm font-semibold text-orange-800 dark:text-orange-200 mb-0.5">
                                🏷️ {restaurant.offre_label || 'Offre en cours'}
                              </p>
                              {restaurant.offre_description && (
                                <p className="text-xs sm:text-sm text-orange-700/90 dark:text-orange-300/90">
                                  {restaurant.offre_description}
                                </p>
                              )}
                            </div>
                          )}
                          
                          {/* Informations de livraison - Optimisé mobile */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[10px] sm:text-xs md:text-sm mb-3 sm:mb-4 md:mb-6 space-y-1 sm:space-y-0 sm:gap-2">
                            <div className="flex items-center text-gray-500 dark:text-gray-400">
                              <FaMotorcycle className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 mr-1 sm:mr-1.5 md:mr-2 flex-shrink-0" />
                              <span className="whitespace-nowrap">Livraison à partir de {restaurant.frais_livraison || restaurant.deliveryFee || 2.50}€</span>
                            </div>
                            <div className="text-gray-500 dark:text-gray-400 whitespace-nowrap">
                              Min. {restaurant.minOrder || 15}€
                            </div>
                          </div>
                        </div>
                        
                        {/* Bouton commander - Design moderne et premium */}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestaurantClick(restaurant);
                          }}
                          className="w-full py-4 sm:py-4 px-6 sm:px-8 rounded-xl font-semibold transition-all duration-200 shadow-lg text-base sm:text-base lg:text-lg min-h-[52px] sm:min-h-[56px] touch-manipulation relative overflow-hidden font-display bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 hover:shadow-xl hover:shadow-orange-500/30 transform hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                        >
                          Voir le menu
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
              })}
            </div>
          )}
        </section>

        {/* Publicité footer */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <Advertisement position="footer" />
        </div>
      </main>
    </div>
  );
} // Force rebuild Wed Dec 17 12:18:32 CET 2025
