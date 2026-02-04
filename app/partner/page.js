'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { 
  FaUtensils, 
  FaClock, 
  FaEuroSign, 
  FaBell, 
  FaEdit, 
  FaTrash,
  FaCheck,
  FaTimes,
  FaEye,
  FaChartLine,
  FaCog,
  FaFileAlt,
  FaMapMarkerAlt,
  FaHome,
  FaArrowLeft,
  FaShareAlt,
  FaInstagram,
  FaFacebook,
  FaArrowUp,
  FaMotorcycle
} from 'react-icons/fa';
import RealTimeNotifications from '../components/RealTimeNotifications';
import OrderCountdown from '@/components/OrderCountdown';

const CATEGORY_OPTIONS = [
  { value: 'entree', label: 'Entrée' },
  { value: 'burger', label: 'Burger' },
  { value: 'sandwich', label: 'Sandwich' },
  { value: 'plat', label: 'Plat principal' },
  { value: 'dessert', label: 'Dessert' },
  { value: 'boisson', label: 'Boisson' },
  { value: 'salade', label: 'Salades' },
  { value: 'panini', label: 'Panini' },
  { value: 'wraps_tacos', label: 'Wraps / Tacos' }
];

export default function PartnerDashboard() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null); // Ajout de userData
  const [restaurant, setRestaurant] = useState(null);
  const [stats, setStats] = useState({
    todayOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    recentOrders: []
  });
  const [orders, setOrders] = useState([]);
  const [showOrdersTab, setShowOrdersTab] = useState(false);
  const [menu, setMenu] = useState([]);
  const [menuSections, setMenuSections] = useState([]); // Sections affichées côté client (Entrées, Plats, ...)
  const [formulas, setFormulas] = useState([]);
  const [loading, setLoading] = useState(true);
  // Initialiser activeTab depuis l'URL hash si présent
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '');
      if (['orders', 'menu', 'dashboard', 'formulas', 'combos'].includes(hash)) {
        return hash;
      }
    }
    return 'dashboard';
  });
  const [showMenuModal, setShowMenuModal] = useState(false);
  const createDefaultMenuForm = () => ({
    nom: '',
    description: '',
    prix: '',
    category: '',
    disponible: true,
    image_url: '',
    supplements: [],
    boisson_taille: '',
    prix_taille: '',
    // Nouvelles options de customisation
    meat_options: [],
    sauce_options: [],
    base_ingredients: [],
    requires_meat_selection: false,
    requires_sauce_selection: false,
    max_sauces: null, // Limite de sauces (null = illimité)
    max_meats: null // Limite de viandes (null = illimité)
  });
  const [menuForm, setMenuForm] = useState(createDefaultMenuForm());
  const [editingMenu, setEditingMenu] = useState(null);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionDescription, setNewSectionDescription] = useState('');
  const [editingSection, setEditingSection] = useState(null); // { id, name, description, sort_order }
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDelayModal, setShowDelayModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [acceptingOrder, setAcceptingOrder] = useState(false);
  const [rejectingOrder, setRejectingOrder] = useState(false);
  const [delayMinutes, setDelayMinutes] = useState(5);
  const [updatingDelay, setUpdatingDelay] = useState(false);
  const [timeEstimation, setTimeEstimation] = useState({
    preparationTime: 15
  });

  const [isManuallyClosed, setIsManuallyClosed] = useState(false);
  const [prepTimeMinutes, setPrepTimeMinutes] = useState(25);
  const [prepTimeUpdatedAt, setPrepTimeUpdatedAt] = useState(null);
  const [showPrepTimeModal, setShowPrepTimeModal] = useState(false);
  const [savingPrepTime, setSavingPrepTime] = useState(false);
  const [prepPromptAudioEnabled, setPrepPromptAudioEnabled] = useState(true);
  const audioUnlockedRef = useRef(false);
  const router = useRouter();

  const [supplementForm, setSupplementForm] = useState({
    nom: '',
    prix: 0
  });

  const [showSupplementModal, setShowSupplementModal] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // États pour les formules
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [editingFormula, setEditingFormula] = useState(null);
  const [formulaForm, setFormulaForm] = useState({
    nom: '',
    description: '',
    prix: '',
    prix_reduit: '',
    image_url: '',
    disponible: true,
    menu_items: [] // Array of { menu_id, order_index, quantity }
  });

  // Variable pour éviter les requêtes simultanées (utiliser useRef pour persister entre renders)
  const isFetchingRef = useRef(false);
  const isFetchingCombosRef = useRef(false);

  // Synchroniser activeTab avec l'URL hash
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (['orders', 'menu', 'dashboard', 'formulas', 'combos'].includes(hash)) {
        setActiveTab(hash);
      }
    };
    
    // Vérifier le hash initial au chargement
    if (typeof window !== 'undefined') {
      handleHashChange();
    }
    
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Mettre à jour l'URL hash quand activeTab change (mais seulement si ce n'est pas déjà le bon)
  useEffect(() => {
    if (typeof window !== 'undefined' && activeTab) {
      const currentHash = window.location.hash.replace('#', '');
      if (currentHash !== activeTab) {
        window.history.replaceState({}, '', `#${activeTab}`);
      }
    }
  }, [activeTab]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
        return;
      }

      // Verifier le role
      console.log('🔍 DEBUG PARTNER - Session user ID:', session.user.id);
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      console.log('🔍 DEBUG PARTNER - UserData complet:', userData);
      console.log('🔍 DEBUG PARTNER - UserError:', userError);
      console.log('🔍 DEBUG PARTNER - Rôle utilisateur:', userData?.role);
      console.log('🔍 DEBUG PARTNER - Rôle attendu: restaurant');
      console.log('🔍 DEBUG PARTNER - Comparaison:', userData?.role === 'restaurant');
      
      // Autoriser les restaurants ET les admins
      if (userError || !userData || (userData.role !== 'restaurant' && userData.role !== 'admin')) {
        console.log('❌ ACCÈS REFUSÉ - Redirection vers login');
        console.log('Rôle utilisateur:', userData?.role, 'Attendu: restaurant ou admin');
        router.push('/login');
        return;
      }
      
      console.log('✅ ACCÈS AUTORISÉ - Rôle', userData.role, 'confirmé');

      setUser(session.user);
      setUserData(userData); // Stocker userData dans le state

      // Recuperer le restaurant (si admin, on peut afficher la page mais sans restaurant)
      const { data: resto, error: restoError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      console.log('🔍 DEBUG PARTNER - Restaurant:', resto);
      console.log('🔍 DEBUG PARTNER - Restaurant Error:', restoError);

      // Si ce n'est pas un admin et qu'il n'y a pas de restaurant, rediriger
      if (userData.role !== 'admin' && (restoError || !resto)) {
        console.log('⚠️ Aucun restaurant trouvé pour cet utilisateur, redirection vers profil-partenaire');
        console.log('Restaurant Error Code:', restoError?.code);
        console.log('Restaurant Error Message:', restoError?.message);
        
        // Si l'erreur est "PGRST116" (pas trouvé), c'est normal pour un nouveau partenaire
        // Sinon, il y a peut-être un problème
        if (restoError && restoError.code !== 'PGRST116') {
          console.error('❌ Erreur inattendue lors de la récupération du restaurant:', restoError);
        }
        
        router.push('/profil-partenaire');
        return;
      }

      // Si admin, on peut continuer sans restaurant
      if (userData.role === 'admin' && (restoError || !resto)) {
        console.log('ℹ️ Admin sans restaurant - Affichage de la page sans données restaurant');
        setLoading(false);
        return;
      }

      setRestaurant(resto);
      // Temps de préparation (si migration appliquée)
      setPrepTimeMinutes(Number.isFinite(parseInt(resto.prep_time_minutes, 10)) ? parseInt(resto.prep_time_minutes, 10) : 25);
      setPrepTimeUpdatedAt(resto.prep_time_updated_at || null);
      // Normaliser ferme_manuellement pour être sûr que c'est un booléen strict
      let normalizedFermeManuel;
      if (resto?.ferme_manuellement === true || resto?.ferme_manuellement === 'true' || resto?.ferme_manuellement === 1 || resto?.ferme_manuellement === '1') {
        normalizedFermeManuel = true;
      } else if (resto?.ferme_manuellement === false || resto?.ferme_manuellement === 'false' || resto?.ferme_manuellement === 0 || resto?.ferme_manuellement === '0') {
        normalizedFermeManuel = false;
      } else {
        // Valeur invalide ou undefined, utiliser false par défaut (ouvert)
        normalizedFermeManuel = false;
      }
      setIsManuallyClosed(normalizedFermeManuel);
      console.log('📋 Restaurant chargé:', {
        nom: resto?.nom,
        ferme_manuellement_original: resto?.ferme_manuellement,
        ferme_manuellement_type: typeof resto?.ferme_manuellement,
        normalizedFermeManuel,
        isManuallyClosed: normalizedFermeManuel
      });
      
      if (resto?.id) {
        await fetchDashboardData(resto.id);
        await fetchMenuSections(resto.id);
        await fetchMenu(resto.id);
        await fetchOrders(resto.id);
        await fetchFormulas();
        await fetchCombos(resto.id);
      }

      // Prompt quotidien directement sur le dashboard (timezone France)
      try {
        const tz = 'Europe/Paris';
        const today = new Date().toLocaleDateString('fr-FR', { timeZone: tz });
        const last = resto.prep_time_updated_at
          ? new Date(resto.prep_time_updated_at).toLocaleDateString('fr-FR', { timeZone: tz })
          : null;
        if (!resto.prep_time_minutes || !last || last !== today) {
          setShowPrepTimeModal(true);
        }
      } catch {
        // ignore
      }
      
      setLoading(false);
    };

    fetchData();
  }, [router]);

  // SSE: permettre un déclenchement "en direct" d'une popup (ex: demander le temps de préparation)
  useEffect(() => {
    let eventSource = null;
    let cancelled = false;

    const connect = async () => {
      try {
        if (!restaurant?.id) return;
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) return;

        const url = `/api/partner/notifications/sse?restaurantId=${restaurant.id}&token=${encodeURIComponent(token)}`;
        eventSource = new EventSource(url);

        eventSource.onmessage = (event) => {
          if (cancelled) return;
          try {
            const data = JSON.parse(event.data);
            if (data?.type === 'prep_time_prompt') {
              setShowPrepTimeModal(true);
            }
          } catch {
            // ignore
          }
        };

        eventSource.onerror = () => {
          // Ne pas spam; on laisse le navigateur gérer la reconnexion SSE si possible
        };
      } catch {
        // ignore
      }
    };

    connect();

    return () => {
      cancelled = true;
      try {
        if (eventSource) eventSource.close();
      } catch {
        // ignore
      }
    };
  }, [restaurant?.id]);

  const playPrepPromptSound = async () => {
    if (!prepPromptAudioEnabled) return;
    try {
      // AudioContext (beep) — évite de dépendre d'un fichier audio
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        await ctx.resume().catch(() => {});
      }
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.36);
      setTimeout(() => {
        try { ctx.close(); } catch {}
      }, 500);
    } catch {
      // iOS peut bloquer si pas d'interaction utilisateur
    }
  };

  const triggerPrepTimePrompt = () => {
    setShowPrepTimeModal(true);
    // Son uniquement si l'onglet est visible
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      playPrepPromptSound();
    }
  };

  // Tenter d'“unlock” l'audio après la première interaction utilisateur
  useEffect(() => {
    const unlock = async () => {
      if (audioUnlockedRef.current) return;
      audioUnlockedRef.current = true;
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        await ctx.resume().catch(() => {});
        await ctx.close().catch(() => {});
      } catch {
        // ignore
      }
    };
    window.addEventListener('touchstart', unlock, { passive: true });
    window.addEventListener('mousedown', unlock, { passive: true });
    return () => {
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('mousedown', unlock);
    };
  }, []);

  // Realtime (Supabase): plus fiable que SSE en serverless pour déclencher une popup "en direct"
  useEffect(() => {
    if (!restaurant?.id) return;

    let channel = null;
    try {
      channel = supabase
        .channel(`partner_prep_prompt_${restaurant.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `restaurant_id=eq.${restaurant.id}`,
          },
          (payload) => {
            const row = payload?.new || {};
            if (row?.type === 'prep_time_prompt') {
              triggerPrepTimePrompt();
            }
          }
        )
        .subscribe();
    } catch {
      // ignore
    }

    return () => {
      try {
        if (channel) supabase.removeChannel(channel);
      } catch {
        // ignore
      }
    };
  }, [restaurant?.id]);

  // Fallback ultra-robuste: poll les notifications non lues et ouvre la popup si on reçoit prep_time_prompt
  // (utile si Realtime est désactivé/coupé côté Supabase)
  useEffect(() => {
    if (!restaurant?.id) return;
    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch(`/api/partner/notifications?restaurantId=${restaurant.id}`);
        if (!res.ok) return;
        const notifs = await res.json().catch(() => []);
        if (!Array.isArray(notifs) || notifs.length === 0) return;

        const hasPrepPrompt = notifs.some((n) => n?.type === 'prep_time_prompt');
        if (hasPrepPrompt && !cancelled) {
          triggerPrepTimePrompt();
          // Marquer comme lues pour éviter de re-pop à l'infini
          fetch('/api/partner/notifications/mark-all-read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ restaurantId: restaurant.id }),
          }).catch(() => {});
        }
      } catch {
        // ignore
      }
    };

    // Check immédiat + toutes les 10s + au focus / retour au premier plan
    check();
    const interval = setInterval(check, 10000);

    const onFocus = () => check();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') check();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      clearInterval(interval);
    };
  }, [restaurant?.id]);

    // Rafraîchir automatiquement les commandes toutes les 60 secondes (réduit pour éviter rate limiting)
    // Note: Le rafraîchissement réel se fait via Supabase Realtime dans RealTimeNotifications
    useEffect(() => {
      if (!restaurant?.id) return;
      
      const ordersInterval = setInterval(() => {
        // Vérifier que l'onglet est actif avant de rafraîchir
        if (document.visibilityState === 'visible') {
          fetchOrders(restaurant.id);
        }
      }, 60000); // 60 secondes (augmenté pour éviter rate limiting)
      
      // Nettoyer l'intervalle lors du démontage
      return () => {
        clearInterval(ordersInterval);
      };
    }, [restaurant?.id]);

  const fetchDashboardData = async (restaurantId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const token = session.access_token;
      const response = await fetch(`/api/partner/dashboard?restaurantId=${restaurantId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setStats(data);
      }
    } catch (error) {
      console.error('Erreur recuperation dashboard:', error);
    }
  };

  const fetchMenu = async (restaurantId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const token = session.access_token;
      const response = await fetch(`/api/partner/menu?restaurantId=${restaurantId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        // Parser les suppléments JSONB si nécessaire
        const parsedMenu = data.map(item => {
          let parsedSupplements = [];
          if (item.supplements) {
            if (typeof item.supplements === 'string') {
              try {
                parsedSupplements = JSON.parse(item.supplements);
              } catch (e) {
                console.error('Erreur parsing suppléments pour item', item.id, ':', e);
                parsedSupplements = [];
              }
            } else if (Array.isArray(item.supplements)) {
              parsedSupplements = item.supplements;
            }
          }

          let parsedBaseIngredients = [];
          if (item.base_ingredients) {
            if (typeof item.base_ingredients === 'string') {
              try {
                parsedBaseIngredients = JSON.parse(item.base_ingredients);
              } catch (e) {
                console.error('Erreur parsing ingrédients pour item', item.id, ':', e);
                parsedBaseIngredients = [];
              }
            } else if (Array.isArray(item.base_ingredients)) {
              parsedBaseIngredients = item.base_ingredients;
            }
          }

          return {
            ...item,
            supplements: parsedSupplements,
            base_ingredients: parsedBaseIngredients
          };
        });
        setMenu(parsedMenu);
      }
    } catch (error) {
      console.error('Erreur recuperation menu:', error);
    }
  };

  const fetchMenuSections = async (restaurantId) => {
    if (!restaurantId) return;
    setSectionsLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || null;
      const response = await fetch(`/api/partner/categories?restaurantId=${restaurantId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const payload = await response.json().catch(() => []);
      if (!response.ok) {
        console.warn('⚠️ Erreur récupération sections:', payload?.error || response.statusText);
        setMenuSections([]);
        return;
      }
      setMenuSections(Array.isArray(payload) ? payload : []);
    } catch (e) {
      console.warn('⚠️ Erreur fetchMenuSections:', e?.message || e);
      setMenuSections([]);
    } finally {
      setSectionsLoading(false);
    }
  };

  const createMenuSection = async () => {
    if (!restaurant?.id) return;
    const name = (newSectionName || '').trim();
    if (!name) {
      alert('Nom de section requis');
      return;
    }
    setSectionsLoading(true);
    try {
      const { data: auth } = await supabase.auth.getSession();
      const token = auth?.session?.access_token || null;
      const response = await fetch('/api/partner/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          restaurantId: restaurant.id,
          name,
          description: (newSectionDescription || '').trim(),
          sort_order: (menuSections?.length || 0) + 1
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Erreur création section');
      }
      setNewSectionName('');
      setNewSectionDescription('');
      await fetchMenuSections(restaurant.id);
    } catch (e) {
      alert(e?.message || 'Erreur création section');
    } finally {
      setSectionsLoading(false);
    }
  };

  const saveEditedMenuSection = async () => {
    if (!editingSection?.id) return;
    const name = (editingSection.name || '').trim();
    if (!name) {
      alert('Nom de section requis');
      return;
    }
    setSectionsLoading(true);
    try {
      const { data: auth } = await supabase.auth.getSession();
      const token = auth?.session?.access_token || null;
      const response = await fetch('/api/partner/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          id: editingSection.id,
          restaurantId: restaurant?.id || null,
          oldName: (editingSection.oldName || '').trim(),
          name,
          description: (editingSection.description || '').trim(),
          sort_order: editingSection.sort_order ?? 0
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Erreur mise à jour section');
      }
      setEditingSection(null);
      await fetchMenuSections(restaurant.id);
      // le renommage peut impacter les plats -> rafraîchir aussi le menu
      await fetchMenu(restaurant.id);
    } catch (e) {
      alert(e?.message || 'Erreur mise à jour section');
    } finally {
      setSectionsLoading(false);
    }
  };

  const deleteMenuSection = async (section) => {
    if (!section?.id) return;
    if (!confirm(`Supprimer la section "${section.name}" ?\n\nLes plats seront déplacés vers "Autres".`)) return;
    setSectionsLoading(true);
    try {
      const { data: auth } = await supabase.auth.getSession();
      const token = auth?.session?.access_token || null;
      const response = await fetch(`/api/partner/categories?id=${section.id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Erreur suppression section');
      }
      await fetchMenuSections(restaurant.id);
      await fetchMenu(restaurant.id);
    } catch (e) {
      alert(e?.message || 'Erreur suppression section');
    } finally {
      setSectionsLoading(false);
    }
  };

  const moveMenuSection = async (sectionId, direction) => {
    if (!restaurant?.id) return;
    const idx = (menuSections || []).findIndex((s) => s.id === sectionId);
    if (idx === -1) return;
    const nextIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (nextIdx < 0 || nextIdx >= menuSections.length) return;

    const reordered = [...menuSections];
    const tmp = reordered[idx];
    reordered[idx] = reordered[nextIdx];
    reordered[nextIdx] = tmp;

    // Mettre à jour sort_order localement (1..n)
    const payload = reordered.map((s, i) => ({ ...s, sort_order: i + 1 }));
    setMenuSections(payload);

    try {
      const { data: auth } = await supabase.auth.getSession();
      const token = auth?.session?.access_token || null;
      const response = await fetch('/api/partner/categories/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          restaurantId: restaurant.id,
          categories: payload.map((s) => ({ id: s.id }))
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Erreur réorganisation sections');
      }
    } catch (e) {
      alert(e?.message || 'Erreur réorganisation sections');
      // rollback visuel
      await fetchMenuSections(restaurant.id);
    }
  };

  const fetchFormulas = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/partner/formulas', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setFormulas(Array.isArray(data) ? data : []);
      } else {
        console.error('Erreur récupération formules');
        setFormulas([]);
      }
    } catch (error) {
      console.error('Erreur récupération formules:', error);
      setFormulas([]);
    }
  };

  const fetchCombos = async (restaurantId) => {
    if (!restaurantId) return;
    if (isFetchingCombosRef.current) return;

    try {
      isFetchingCombosRef.current = true;
      setCombosLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || null;

      const response = await fetch(`/api/partner/menu-combos?restaurantId=${restaurantId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erreur lors de la récupération des menus composés');
      }

      const data = await response.json();
      const normalizedCombos = Array.isArray(data)
        ? data.map((combo) => ({
            ...combo,
            prix_base: combo?.prix_base !== undefined && combo?.prix_base !== null
              ? parseFloat(combo.prix_base)
              : 0,
            steps: Array.isArray(combo?.steps)
              ? combo.steps.map((step) => ({
                  ...step,
                  min_selections: step?.min_selections !== undefined && step?.min_selections !== null
                    ? step.min_selections
                    : 0,
                  max_selections: step?.max_selections !== undefined && step?.max_selections !== null
                    ? step.max_selections
                    : (step?.min_selections === 0 ? 0 : Math.max(1, step?.min_selections ?? 1)),
                  options: Array.isArray(step?.options)
                    ? step.options.map((option) => ({
                        ...option,
                        prix_supplementaire:
                          option?.prix_supplementaire !== undefined && option?.prix_supplementaire !== null
                            ? parseFloat(option.prix_supplementaire)
                            : 0,
                        variants: Array.isArray(option?.variants)
                          ? option.variants.map((variant) => ({
                              ...variant,
                              prix_supplementaire:
                                variant?.prix_supplementaire !== undefined && variant?.prix_supplementaire !== null
                                  ? parseFloat(variant.prix_supplementaire)
                                  : 0
                            }))
                          : [],
                        base_ingredients: Array.isArray(option?.base_ingredients)
                          ? option.base_ingredients.map((ingredient) => ({
                              ...ingredient,
                              prix_supplementaire:
                                ingredient?.prix_supplementaire !== undefined && ingredient?.prix_supplementaire !== null
                                  ? parseFloat(ingredient.prix_supplementaire)
                                  : 0,
                              removable: ingredient?.removable !== false
                            }))
                          : []
                      }))
                    : []
                }))
              : []
          }))
        : [];

      setComboList(normalizedCombos);
    } catch (error) {
      console.error('Erreur récupération menus composés:', error);
      setComboList([]);
    } finally {
      setCombosLoading(false);
      isFetchingCombosRef.current = false;
    }
  };

  const handleMenuSubmit = async (e) => {
    e.preventDefault();
    
    // Vérifications de base
    if (!menuForm.nom || !menuForm.prix) {
      alert('Veuillez remplir le nom et le prix du plat');
      return;
    }

    // Vérifier que le restaurant existe (sauf pour les admins en mode édition)
    if (!editingMenu && (!restaurant || !restaurant.id)) {
      alert('Erreur: Restaurant non trouvé. Veuillez rafraîchir la page.');
      console.error('❌ Restaurant non défini:', restaurant);
      return;
    }

    // Vérifier que userData existe
    if (!userData || !userData.email) {
      alert('Erreur: Session utilisateur invalide. Veuillez vous reconnecter.');
      console.error('❌ UserData non défini:', userData);
      return;
    }

    try {
      const url = editingMenu ? '/api/partner/menu' : '/api/partner/menu';
      const method = editingMenu ? 'PUT' : 'POST';
      
      // Préparer le body avec tous les champs, y compris les suppléments
      const body = editingMenu 
        ? { 
            id: editingMenu.id, 
            nom: menuForm.nom,
            description: menuForm.description || '',
            prix: menuForm.prix,
            category: menuForm.category || 'Autres',
            disponible: menuForm.disponible !== false,
            image_url: menuForm.image_url || null,
            supplements: Array.isArray(menuForm.supplements) ? menuForm.supplements : [],
            boisson_taille: menuForm.boisson_taille || null,
            prix_taille: menuForm.prix_taille || null,
            meat_options: menuForm.meat_options || [],
            sauce_options: menuForm.sauce_options || [],
            base_ingredients: menuForm.base_ingredients || [],
            requires_meat_selection: menuForm.requires_meat_selection || false,
            requires_sauce_selection: menuForm.requires_sauce_selection || false,
            max_sauces: (menuForm.max_sauces !== null && menuForm.max_sauces !== undefined) ? menuForm.max_sauces : null,
            max_meats: (menuForm.max_meats !== null && menuForm.max_meats !== undefined) ? menuForm.max_meats : null,
            user_email: userData.email
          }
        : { 
            restaurant_id: restaurant.id,
            nom: menuForm.nom,
            description: menuForm.description || '',
            prix: menuForm.prix,
            category: menuForm.category || 'Autres',
            disponible: menuForm.disponible !== false,
            image_url: menuForm.image_url || null,
            supplements: Array.isArray(menuForm.supplements) ? menuForm.supplements : [],
            boisson_taille: menuForm.boisson_taille || null,
            prix_taille: menuForm.prix_taille || null,
            meat_options: menuForm.meat_options || [],
            sauce_options: menuForm.sauce_options || [],
            base_ingredients: menuForm.base_ingredients || [],
            requires_meat_selection: menuForm.requires_meat_selection || false,
            requires_sauce_selection: menuForm.requires_sauce_selection || false,
            max_sauces: (menuForm.max_sauces !== null && menuForm.max_sauces !== undefined) ? menuForm.max_sauces : null,
            max_meats: (menuForm.max_meats !== null && menuForm.max_meats !== undefined) ? menuForm.max_meats : null,
            user_email: userData.email
          };

      console.log('📤 DEBUG - Envoi menu avec suppléments:', JSON.stringify(body, null, 2));
      console.log('📤 DEBUG - Suppléments dans le formulaire:', JSON.stringify(menuForm.supplements, null, 2));
      console.log('📤 DEBUG - Restaurant ID:', restaurant?.id);

      // Récupérer le token pour l'authentification
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Erreur: Session expirée. Veuillez vous reconnecter.');
        return;
      }

      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(body)
      });

      const responseData = await response.json().catch(() => ({}));

      if (response.ok) {
        console.log('✅ Plat ajouté/modifié avec succès');
        setShowMenuModal(false);
        setMenuForm(createDefaultMenuForm());
        setEditingMenu(null);
        
        // Rafraîchir le menu seulement si le restaurant existe
        if (restaurant?.id) {
          await fetchMenu(restaurant.id);
        } else {
          console.warn('⚠️ Restaurant ID non disponible pour rafraîchir le menu');
        }
      } else {
        console.error('❌ Erreur API:', responseData);
        alert(`Erreur lors de la sauvegarde: ${responseData.error || response.statusText || 'Erreur inconnue'}`);
      }
    } catch (error) {
      console.error('❌ Erreur sauvegarde menu:', error);
      alert(`Erreur: ${error.message || 'Impossible de sauvegarder le plat'}`);
    }
  };

  const handleDeleteMenu = async (menuId) => {
    if (!confirm('Etes-vous sur de vouloir supprimer ce plat ?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const token = session.access_token;
      const response = await fetch(`/api/partner/menu?id=${menuId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        await fetchMenu(restaurant.id);
      }
    } catch (error) {
      console.error('Erreur suppression menu:', error);
    }
  };

  const handleToggleMenuAvailability = async (menuItem) => {
    try {
      if (!userData?.email) {
        alert('Erreur: utilisateur non authentifié.');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Session expirée. Veuillez vous reconnecter.');
        return;
      }

      const response = await fetch('/api/partner/menu', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          id: menuItem.id,
          disponible: !menuItem.disponible,
          user_email: userData.email
        })
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error('❌ Erreur toggle disponibilité:', payload);
        alert(payload?.error || 'Impossible de mettre à jour la disponibilité');
        return;
      }

      const updatedItem = payload?.menu || payload;

      setMenu(prev =>
        prev.map(item =>
          item.id === menuItem.id
            ? { ...item, disponible: updatedItem?.disponible ?? !menuItem.disponible }
            : item
        )
      );
    } catch (error) {
      console.error('❌ Erreur toggle disponibilité menu:', error);
      alert(error.message || 'Impossible de mettre à jour la disponibilité');
    }
  };

  const handleFormulaSubmit = async (e) => {
    e.preventDefault();
    
    if (!formulaForm.nom || !formulaForm.prix || !formulaForm.menu_items || formulaForm.menu_items.length === 0) {
      alert('Veuillez remplir le nom, le prix et sélectionner au moins un plat');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Erreur: Session expirée. Veuillez vous reconnecter.');
        return;
      }

      const url = editingFormula ? `/api/partner/formulas/${editingFormula.id}` : '/api/partner/formulas';
      const method = editingFormula ? 'PUT' : 'POST';

      const body = {
        nom: formulaForm.nom.trim(),
        description: formulaForm.description || '',
        prix: parseFloat(formulaForm.prix),
        prix_reduit: formulaForm.prix_reduit ? parseFloat(formulaForm.prix_reduit) : null,
        image_url: formulaForm.image_url || null,
        disponible: formulaForm.disponible !== false,
        menu_items: formulaForm.menu_items.map((item, index) => ({
          menu_id: item.menu_id,
          order_index: item.order_index !== undefined ? item.order_index : index,
          quantity: item.quantity || 1
        }))
      };

      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(body)
      });

      const responseData = await response.json().catch(() => ({}));

      if (response.ok) {
        setShowFormulaModal(false);
        setFormulaForm({
          nom: '',
          description: '',
          prix: '',
          prix_reduit: '',
          image_url: '',
          disponible: true,
          menu_items: []
        });
        setEditingFormula(null);
        await fetchFormulas();
      } else {
        alert(`Erreur: ${responseData.error || response.statusText || 'Erreur inconnue'}`);
      }
    } catch (error) {
      console.error('Erreur sauvegarde formule:', error);
      alert(`Erreur: ${error.message || 'Impossible de sauvegarder la formule'}`);
    }
  };

  const handleDeleteFormula = async (formulaId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette formule ?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const response = await fetch(`/api/partner/formulas/${formulaId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (response.ok) {
        await fetchFormulas();
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Erreur: ${errorData.error || 'Impossible de supprimer la formule'}`);
      }
    } catch (error) {
      console.error('Erreur suppression formule:', error);
      alert('Erreur lors de la suppression de la formule');
    }
  };

  const updateOrderStatus = async (orderId, status, prepTime = null, reason = null) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('❌ Aucune session trouvée');
        router.push('/login');
        return;
      }

      const requestBody = { status };
      if (prepTime !== null && prepTime > 0) {
        requestBody.preparation_time = prepTime;
      }
      if (reason && reason.trim()) {
        requestBody.reason = reason.trim();
      }

      const response = await fetch(`/api/restaurants/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
        throw new Error(errorData.error || 'Impossible de mettre à jour la commande');
      }

      await new Promise(resolve => setTimeout(resolve, 500));
      await fetchOrders(restaurant?.id);
      if (restaurant?.id) {
        await fetchDashboardData(restaurant.id);
      }
    } catch (error) {
      console.error('❌ Erreur mise à jour commande:', error);
      alert(`Erreur: ${error.message || 'Impossible de mettre à jour la commande'}`);
    }
  };

  const openAcceptModal = (order) => {
    setSelectedOrder(order);
    const preparation = order?.preparation_time || 15;
    setTimeEstimation({
      preparationTime: preparation
    });
    setShowAcceptModal(true);
  };

  const openRejectModal = (order) => {
    setSelectedOrder(order);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const openDelayModal = (order) => {
    setSelectedOrder(order);
    setDelayMinutes(5);
    setShowDelayModal(true);
  };

  const handleRemoveIngredient = async (orderId, detailId, ingredientId, type) => {
    if (!orderId || !detailId || !ingredientId) {
      alert('Erreur: Informations manquantes');
      return;
    }

    const ingredientType = type === 'meat' ? 'viande' : type === 'sauce' ? 'sauce' : 'ingrédient';
    
    if (!confirm(`Voulez-vous vraiment retirer cette ${ingredientType} de la commande ? Le client sera notifié.`)) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('❌ Aucune session trouvée');
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/restaurants/orders/${orderId}/details/${detailId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          removedIngredients: [ingredientId],
          type: type // 'meat' ou 'sauce'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
        throw new Error(errorData.error || 'Erreur lors de la suppression de l\'ingrédient');
      }

      // Rafraîchir les commandes
      if (restaurant?.id) {
        await fetchOrders(restaurant.id);
        await fetchDashboardData(restaurant.id);
      }

      alert(`${ingredientType.charAt(0).toUpperCase() + ingredientType.slice(1)} retirée avec succès. Le client sera notifié.`);
    } catch (error) {
      console.error('❌ Erreur retrait ingrédient:', error);
      alert(`Erreur: ${error.message || 'Impossible de retirer l\'ingrédient'}`);
    }
  };

  const handleAddDelay = async () => {
    if (!selectedOrder || delayMinutes <= 0) return;
    
    try {
      setUpdatingDelay(true);
      
      // Calculer le nouveau temps de préparation = temps actuel + retard
      const currentPrepTime = selectedOrder.preparation_time || 15;
      const newPrepTime = currentPrepTime + delayMinutes;
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('❌ Aucune session trouvée');
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/restaurants/orders/${selectedOrder.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          status: selectedOrder.statut, // Garder le même statut
          preparation_time: newPrepTime
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
        throw new Error(errorData.error || 'Erreur lors de la mise à jour du retard');
      }

      setShowDelayModal(false);
      setDelayMinutes(5);
      await new Promise(resolve => setTimeout(resolve, 500));
      await fetchOrders(restaurant?.id);
      if (restaurant?.id) {
        await fetchDashboardData(restaurant.id);
      }
    } catch (error) {
      console.error('❌ Erreur ajout retard:', error);
      alert(`Erreur: ${error.message || 'Impossible d\'ajouter le retard'}`);
    } finally {
      setUpdatingDelay(false);
    }
  };

  const handleAcceptOrderSubmit = async () => {
    if (!selectedOrder) return;
    try {
      setAcceptingOrder(true);
      await updateOrderStatus(
        selectedOrder.id,
        'acceptee',
        Number(timeEstimation.preparationTime) || 15
      );
      setShowAcceptModal(false);
      setSelectedOrder(null);
    } catch (error) {
      console.error('❌ Erreur acceptation commande:', error);
      alert(`Erreur: ${error.message || 'Impossible d\'accepter la commande'}`);
    } finally {
      setAcceptingOrder(false);
    }
  };

  const handleRejectOrderSubmit = async () => {
    if (!selectedOrder) return;
    try {
      setRejectingOrder(true);
      await updateOrderStatus(
        selectedOrder.id,
        'refusee',
        null,
        rejectReason
      );
      setShowRejectModal(false);
      setRejectReason('');
      setSelectedOrder(null);
    } catch (error) {
      console.error('❌ Erreur refus commande:', error);
      alert(`Erreur: ${error.message || 'Impossible de refuser la commande'}`);
    } finally {
      setRejectingOrder(false);
    }
  };

  const handleTimeEstimationChange = (field, value) => {
    const parsed = Math.max(0, parseInt(value, 10) || 0);
    setTimeEstimation(prev => {
      const next = {
        ...prev,
        [field]: parsed
      };
      // Le temps total est maintenant uniquement le temps de préparation
      // Le temps de livraison sera défini par le livreur
      next.estimatedTotalTime = next.preparationTime;
      return next;
    });
  };

  const getCustomerName = (order) => {
    const firstName = order?.customer_first_name || order?.customer?.firstName || order?.users?.prenom || '';
    const lastName = order?.customer_last_name || order?.customer?.lastName || order?.users?.nom || '';
    const full = `${firstName} ${lastName}`.trim();
    if (full) return full;
    return order?.customer_email || order?.customer?.email || order?.users?.email || 'Client';
  };

  const getCustomerPhone = (order) => {
    return order?.customer_phone || order?.customer?.phone || order?.users?.telephone || '';
  };

  const getCustomerEmail = (order) => {
    return order?.customer_email || order?.customer?.email || order?.users?.email || '';
  };

  const getOrderItems = (order) => {
    if (Array.isArray(order?.order_items) && order.order_items.length > 0) {
      return order.order_items;
    }
    if (Array.isArray(order?.details_commande) && order.details_commande.length > 0) {
      return order.details_commande.map(detail => ({
        id: detail.id,
        name: detail.menus?.nom || detail.name || 'Article',
        quantity: detail.quantite || detail.quantity || 0,
        price: Number(detail.prix_unitaire || detail.price || detail.menus?.prix || 0)
      }));
    }
    return [];
  };

  const getSubtotal = (order) => {
    // IMPORTANT: Toujours recalculer depuis details_commande pour garantir l'exactitude
    // Ne pas utiliser order.total qui peut être incorrect pour les anciennes commandes
    // IMPORTANT: prix_unitaire contient DÉJÀ les suppléments, ne pas les ajouter à nouveau
    if (Array.isArray(order?.details_commande) && order.details_commande.length > 0) {
      const calculated = order.details_commande.reduce((sum, detail) => {
        // prix_unitaire contient déjà le prix de base + suppléments + viandes + sauces + taille
        const prixUnitaire = Number(detail.prix_unitaire || 0);
        const quantite = Number(detail.quantite || 1);
        
        // Calculer le total pour cet item
        const totalItemPrice = prixUnitaire * quantite;
        
        // Log pour déboguer
        console.log(`💰 Item: ${detail.menus?.nom || 'Sans nom'}, prix_unitaire: ${prixUnitaire}€, quantite: ${quantite}, total: ${totalItemPrice}€`);
        
        return sum + totalItemPrice;
      }, 0);
      
      console.log(`💰 Commande ${order.id?.slice(0, 8)}: Total calculé = ${calculated}€, order.total = ${order.total}€`);
      return calculated;
    }
    
    // Fallback : utiliser order_items si disponible
    if (Array.isArray(order?.order_items) && order.order_items.length > 0) {
      return order.order_items.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 0)), 0);
    }
    
    // Dernier fallback : utiliser subtotal ou total (mais ce n'est pas fiable)
    if (typeof order?.subtotal === 'number') return order.subtotal;
    if (typeof order?.total === 'number') return order.total;
    return Number(order?.total_amount ?? 0);
  };

  const getDeliveryFee = (order) => {
    return Number(order?.delivery_fee ?? order?.frais_livraison ?? 0);
  };

  const getTotalAmount = (order) => {
    if (typeof order?.total_amount === 'number') return order.total_amount;
    return getSubtotal(order) + getDeliveryFee(order);
  };

  const addSupplement = () => {
    // Vérifier que le nom et le prix sont valides
    if (!supplementForm.nom || !supplementForm.nom.trim()) {
      alert('Veuillez entrer un nom pour le supplément');
      return;
    }
    
    const prix = parseFloat(supplementForm.prix);
    if (isNaN(prix) || prix < 0) {
      alert('Veuillez entrer un prix valide (zéro ou valeur positive)');
      return;
    }
    
    // S'assurer que supplements est un tableau
    setMenuForm(prev => ({
      ...prev,
      supplements: Array.isArray(prev.supplements) 
        ? [...prev.supplements, { ...supplementForm, id: Date.now(), prix }]
        : [{ ...supplementForm, id: Date.now(), prix }]
    }));
    
    // Réinitialiser le formulaire
    setSupplementForm({ nom: '', prix: 0 });
    setShowSupplementModal(false);
  };

  const removeSupplement = (index) => {
    setMenuForm(prev => ({
      ...prev,
      supplements: prev.supplements.filter((_, i) => i !== index)
    }));
  };

  

  const handleImageUrlUpload = async (imageUrl, menuItemId) => {
    if (imageUrl) {
      try {
        const formData = new FormData();
        formData.append('imageUrl', imageUrl);
        formData.append('menuItemId', menuItemId);
        formData.append('userEmail', userData.email);

        const response = await fetch('/api/partner/upload-image', {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          const { imageUrl: newImageUrl } = await response.json();
          // Mettre à jour la liste des plats
          setMenu(prev => prev.map(item =>
            item.id === menuItemId ? { ...item, image_url: newImageUrl } : item
          ));
        }
      } catch (error) {
        console.error('Erreur upload URL image:', error);
      }
    }
  };

  const fetchOrders = async (restaurantId) => {
    // Éviter les requêtes simultanées
    if (isFetchingRef.current) {
      console.log('⏳ fetchOrders: Requête déjà en cours, ignorée');
      return;
    }

    isFetchingRef.current = true;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('🔍 DEBUG fetchOrders - Session:', session ? 'Présente' : 'Absente');
      if (!session) {
        console.error('❌ Aucune session trouvée');
        isFetchingRef.current = false;
        return;
      }
      
      const token = session.access_token;
      console.log('🔍 DEBUG fetchOrders - Token:', token ? 'Présent' : 'Absent');
      console.log('🔍 DEBUG fetchOrders - RestaurantId:', restaurantId);
      
      const response = await fetch(`/api/partner/orders?restaurantId=${restaurantId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
        console.error('❌ Erreur API récupération commandes:', response.status, errorData);
        setOrders([]); // Définir un tableau vide en cas d'erreur
        return;
      }
      
      const data = await response.json();
      // S'assurer que data est un tableau
      if (!Array.isArray(data)) {
        console.warn('⚠️ Données API invalides (pas un tableau):', data);
        setOrders([]);
        setStats({
          todayOrders: 0,
          pendingOrders: 0,
          totalRevenue: 0,
          recentOrders: []
        });
        return;
      }
      
      setOrders(data);
      
      // DEBUG: Afficher les statuts des commandes pour diagnostiquer
      console.log('🔍 DEBUG fetchOrders - Statuts des commandes:', 
        data.map(o => ({ 
          id: o.id?.slice(0, 8), 
          statut: o.statut,
          statut_type: typeof o.statut,
          statut_length: o.statut?.length,
          statut_raw: JSON.stringify(o.statut), // Pour voir les caractères invisibles
          ready_for_delivery: o.ready_for_delivery,
          created_at: o.created_at,
          updated_at: o.updated_at
        }))
      );
      
      // DEBUG: Vérifier spécifiquement les commandes en_preparation
      const prepOrders = data.filter(o => o.statut === 'en_preparation' || (o.statut && o.statut.includes('preparation')));
      if (prepOrders.length > 0) {
        console.log('✅ Commandes trouvées avec statut en_preparation:', prepOrders.map(o => ({
          id: o.id?.slice(0, 8),
          statut: o.statut,
          statut_raw: JSON.stringify(o.statut)
        })));
      }
      
      // DEBUG: Vérifier spécifiquement les commandes qui devraient être en_preparation
      const ordersWithIssues = data.filter(o => 
        o.statut === 'annulee' && o.created_at && new Date(o.created_at).getTime() > Date.now() - 3600000 // Dernière heure
      );
      if (ordersWithIssues.length > 0) {
        console.warn('⚠️ Commandes récemment créées mais marquées comme annulées:', ordersWithIssues.map(o => ({
          id: o.id?.slice(0, 8),
          statut: o.statut,
          created_at: o.created_at
        })));
      }
        
      // Calculer les statistiques seulement si data est un tableau valide
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      // Filtrer les commandes d'aujourd'hui
      const todayOrders = data.filter(order => {
        if (!order || !order.created_at) return false;
        const orderDate = new Date(order.created_at);
        return orderDate >= todayStart;
      });
      
      const pendingOrders = data.filter(order => 
        order && order.statut === 'en_attente'
      );
      
      // Calculer le chiffre d'affaires - SEULEMENT les commandes livrées (comptabilisées)
      // Logique métier : Le chiffre d'affaires ne compte que les commandes réellement livrées et payées
      // IMPORTANT : Le chiffre d'affaires n'inclut PAS les frais de livraison (qui vont au livreur)
      // On utilise uniquement order.total qui contient le montant des articles uniquement
      const totalRevenue = data.reduce((sum, order) => {
        if (!order) return sum;
        // Compter uniquement les commandes livrées (statut = 'livree')
        // Les commandes en préparation ou en livraison ne sont pas encore comptabilisées
        if (order.statut === 'livree') {
          // order.total contient UNIQUEMENT le montant des articles (sans frais de livraison)
          // Les frais de livraison ne font pas partie du chiffre d'affaires du restaurant
          const amount = getSubtotal(order); // Recalculé depuis details_commande
          return sum + amount;
        }
        return sum;
      }, 0);
      
      // Calculer le chiffre d'affaires d'aujourd'hui (seulement les livrées)
      const todayRevenue = todayOrders.reduce((sum, order) => {
        if (!order) return sum;
        // Compter uniquement les commandes livrées aujourd'hui
        if (order.statut === 'livree') {
          const amount = getSubtotal(order); // Recalculé depuis details_commande
          return sum + amount;
        }
        return sum;
      }, 0);
      
      console.log('🔍 DEBUG - Calcul chiffre d\'affaires:', {
        totalOrders: data.length,
        todayOrders: todayOrders.length,
        totalRevenue,
        todayRevenue,
        ordersLivrees: data.filter(o => o && o.statut === 'livree').length,
        ordersEnPreparation: data.filter(o => o && o.statut === 'en_preparation').length,
        ordersEnLivraison: data.filter(o => o && o.statut === 'en_livraison').length,
        ordersAnnulees: data.filter(o => o && o.statut === 'annulee').length
      });
      
      setStats({
        todayOrders: todayOrders.length || 0,
        pendingOrders: pendingOrders.length || 0,
        totalRevenue: todayRevenue || 0,
        recentOrders: Array.isArray(data) ? data.slice(0, 5) : []
      });
    } catch (error) {
      console.error('Erreur récupération commandes:', error);
      // Si erreur 429, attendre avant de réessayer
      if (error.message?.includes('429') || error.message?.includes('Too Many Requests')) {
        console.warn('⚠️ Rate limit atteint, attente avant prochaine requête');
      }
    } finally {
      isFetchingRef.current = false;
    }
  };

  const calculateCommission = (totalAmount) => {
    // S'assurer que totalAmount est un nombre valide
    const amount = parseFloat(totalAmount || 0) || 0;
    if (isNaN(amount) || amount < 0) {
      console.warn('⚠️ calculateCommission: totalAmount invalide:', totalAmount);
      return { commission: 0, restaurantRevenue: 0 };
    }
    
    // Vérifier si c'est "La Bonne Pâte" (pas de commission)
    const normalizedRestaurantName = (restaurant?.nom || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    const isInternalRestaurant = normalizedRestaurantName.includes('la bonne pate');
    
    // Pas de commission pour "La Bonne Pâte"
    const commissionRate = isInternalRestaurant ? 0 : 0.20; // 20% pour CVN'EAT
    const commission = amount * commissionRate;
    const restaurantRevenue = amount - commission;
    return { commission, restaurantRevenue };
  };

  const toggleRestaurantClosed = async () => {
    if (!restaurant?.id) {
      console.error('❌ toggleRestaurantClosed: restaurant.id manquant');
      return;
    }
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('❌ toggleRestaurantClosed: session manquante');
        alert('Session expirée. Veuillez vous reconnecter.');
        return;
      }
      
      // S'assurer que isManuallyClosed est un booléen strict avant de le toggler
      const currentIsManuallyClosed = isManuallyClosed === true;
      const newStatus = !currentIsManuallyClosed;
      console.log('🔄 Toggle restaurant fermeture:', {
        restaurant_id: restaurant.id,
        isManuallyClosed_original: isManuallyClosed,
        isManuallyClosed_type: typeof isManuallyClosed,
        currentIsManuallyClosed,
        new_status: newStatus,
        new_status_type: typeof newStatus
      });
      
      const requestBody = {
        ferme_manuellement: newStatus // Envoyer directement le booléen
      };
      
      console.log('📤 Envoi requête API:', {
        url: `/api/partner/restaurant/${restaurant.id}`,
        method: 'PUT',
        body: requestBody
      });
      
      const response = await fetch(`/api/partner/restaurant/${restaurant.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      const responseData = await response.json().catch(() => ({}));
      
      if (response.ok) {
        console.log('✅ Restaurant mis à jour avec succès:', responseData);
        console.log('✅ Données restaurant retournées par API:', {
          id: responseData.restaurant?.id,
          nom: responseData.restaurant?.nom,
          ferme_manuellement: responseData.restaurant?.ferme_manuellement,
          ferme_manuellement_type: typeof responseData.restaurant?.ferme_manuellement
        });
        
        // Utiliser la valeur retournée par l'API pour être sûr
        const finalStatus = responseData.restaurant?.ferme_manuellement !== undefined 
          ? responseData.restaurant.ferme_manuellement 
          : newStatus;
        
        // Normaliser pour être sûr que c'est un booléen strict
        let normalizedStatus;
        if (finalStatus === true || finalStatus === 'true' || finalStatus === 1 || finalStatus === '1') {
          normalizedStatus = true;
        } else if (finalStatus === false || finalStatus === 'false' || finalStatus === 0 || finalStatus === '0') {
          normalizedStatus = false;
        } else {
          // Valeur invalide, utiliser newStatus
          normalizedStatus = newStatus;
        }
        
        console.log('✅ État avant mise à jour:', {
          isManuallyClosed_actuel: isManuallyClosed,
          newStatus,
          finalStatus,
          finalStatus_type: typeof finalStatus,
          normalizedStatus,
          responseData_restaurant: responseData.restaurant
        });
        
        // FORCER la mise à jour de l'état avec la valeur normalisée
        console.log('🔄 Mise à jour état local...');
        console.log('   Avant: isManuallyClosed =', isManuallyClosed);
        console.log('   Après: normalizedStatus =', normalizedStatus);
        
        setIsManuallyClosed(normalizedStatus);
        setRestaurant(prev => {
          const updated = { 
            ...prev, 
            ferme_manuellement: normalizedStatus,
            updated_at: responseData.restaurant?.updated_at || new Date().toISOString()
          };
          console.log('   Restaurant state mis à jour:', {
            id: updated.id,
            nom: updated.nom,
            ferme_manuellement: updated.ferme_manuellement,
            ferme_manuellement_type: typeof updated.ferme_manuellement
          });
          return updated;
        });
        
        // Attendre un tick pour que React mette à jour l'état
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log('✅ État local mis à jour:', {
          isManuallyClosed: normalizedStatus,
          ferme_manuellement: normalizedStatus,
          type: typeof normalizedStatus
        });
        
        alert(normalizedStatus ? 'Restaurant marqué comme fermé' : 'Restaurant marqué comme ouvert');
        
        // Forcer le rafraîchissement de la page d'accueil pour mettre à jour le statut
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('restaurant-status-changed'));
        }
      } else {
        console.error('❌ Erreur API toggle fermeture:', {
          status: response.status,
          statusText: response.statusText,
          error: responseData
        });
        alert(`Erreur: ${responseData.error || responseData.details || 'Impossible de mettre à jour le statut'}`);
      }
    } catch (error) {
      console.error('❌ Erreur toggle fermeture:', error);
      alert('Erreur lors de la mise à jour du statut: ' + error.message);
    }
  };

  const savePrepTime = async ({ closeAfter = false } = {}) => {
    if (!restaurant?.id) return;
    setSavingPrepTime(true);
    try {
      const minutes = parseInt(prepTimeMinutes, 10);
      if (!minutes || Number.isNaN(minutes) || minutes < 5 || minutes > 120) {
        alert('Le temps de préparation doit être entre 5 et 120 minutes.');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Session expirée. Veuillez vous reconnecter.');
        return;
      }

      const res = await fetch(`/api/partner/restaurant/${restaurant.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prep_time_minutes: minutes })
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error('❌ Erreur update prep_time:', payload);
        alert(`Erreur: ${payload.error || payload.details || 'Impossible de mettre à jour le temps de préparation'}`);
        return;
      }

      const updated = payload?.restaurant || {};
      if (updated?.prep_time_minutes) setPrepTimeMinutes(updated.prep_time_minutes);
      if (updated?.prep_time_updated_at) setPrepTimeUpdatedAt(updated.prep_time_updated_at);
      if (!updated?.prep_time_updated_at) setPrepTimeUpdatedAt(new Date().toISOString());

      if (closeAfter) setShowPrepTimeModal(false);
    } finally {
      setSavingPrepTime(false);
    }
  };

  const createDefaultComboForm = () => ({
    nom: '',
    description: '',
    prix_base: '',
    actif: true,
    ordre_affichage: 0,
    steps: [
      {
        title: 'Choix du burger',
        description: 'Sélectionnez le burger souhaité',
        min_selections: 1,
        max_selections: 1,
        options: []
      },
      {
        title: "Choix de l'accompagnement",
        description: 'Frites, salade ou autre accompagnement',
        min_selections: 1,
        max_selections: 1,
        options: []
      },
      {
        title: 'Choix de la boisson',
        description: 'Choisissez la boisson incluse dans le menu',
        min_selections: 1,
        max_selections: 1,
        options: []
      }
    ]
  });

  const [comboList, setComboList] = useState([]);
  const [combosLoading, setCombosLoading] = useState(false);
  const [showComboModal, setShowComboModal] = useState(false);
  const [editingCombo, setEditingCombo] = useState(null);
  const [comboForm, setComboForm] = useState(createDefaultComboForm());
  const [savingCombo, setSavingCombo] = useState(false);
  const [comboStepSearch, setComboStepSearch] = useState({});

  const groupedMenuByCategory = useMemo(() => {
    const groups = {};
    (menu || []).forEach((item) => {
      const key = item.category || 'Autres';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
    });
    return groups;
  }, [menu]);

  const resetComboForm = () => {
    const defaultForm = createDefaultComboForm();
    setComboForm(defaultForm);
    setEditingCombo(null);
    const initialSearch = {};
    defaultForm.steps.forEach((_, index) => {
      initialSearch[index] = '';
    });
    setComboStepSearch(initialSearch);
  };

  const handleOpenComboModal = (combo = null) => {
    if (combo) {
      const normalizedCombo = {
        nom: combo.nom || '',
        description: combo.description || '',
        prix_base:
          combo.prix_base !== undefined && combo.prix_base !== null
            ? combo.prix_base.toString()
            : '',
        actif: combo.actif !== false,
        ordre_affichage: combo.ordre_affichage ?? 0,
        steps: Array.isArray(combo.steps) && combo.steps.length > 0
          ? combo.steps.map((step, stepIndex) => {
              const rawMin = step.min_selections;
              const rawMax = step.max_selections;
              const sanitizedMin = rawMin !== undefined && rawMin !== null ? rawMin : 0;
              const sanitizedMax = rawMax !== undefined && rawMax !== null
                ? rawMax
                : (sanitizedMin === 0 ? 0 : Math.max(1, sanitizedMin));

              return {
                title: step.title || `Étape ${stepIndex + 1}`,
                description: step.description || '',
                min_selections: sanitizedMin.toString(),
                max_selections: sanitizedMax.toString(),
                options: Array.isArray(step.options) && step.options.length > 0
                  ? step.options.map((option, optionIndex) => ({
                      ...option,
                      prix_supplementaire:
                        option?.prix_supplementaire !== undefined && option?.prix_supplementaire !== null
                          ? option.prix_supplementaire.toString()
                          : '',
                      image_url: option.image_url || '',
                      disponible: option.disponible !== false,
                      variants: Array.isArray(option.variants)
                        ? option.variants.map((variant, variantIndex) => ({
                            nom: variant.nom || `Variante ${variantIndex + 1}`,
                            description: variant.description || '',
                            prix_supplementaire:
                              variant.prix_supplementaire !== undefined && variant.prix_supplementaire !== null
                                ? variant.prix_supplementaire.toString()
                                : '',
                            is_default: variant.is_default === true,
                            disponible: variant.disponible !== false
                          }))
                        : [],
                      base_ingredients: Array.isArray(option.base_ingredients)
                        ? option.base_ingredients.map((ingredient, ingredientIndex) => ({
                            id: ingredient.id || `ing-${option.id || optionIndex}-${ingredientIndex}`,
                            nom: ingredient.nom || '',
                            removable: ingredient.removable !== false,
                            prix_supplementaire:
                              ingredient?.prix_supplementaire !== undefined && ingredient?.prix_supplementaire !== null
                                ? ingredient.prix_supplementaire.toString()
                                : '',
                            ordre: ingredient.ordre ?? ingredientIndex
                          }))
                        : []
                    }))
                  : [{
                      type: 'link_to_item',
                      linked_menu_id: '',
                      nom: '',
                      description: '',
                      prix_supplementaire: '',
                      image_url: '',
                      disponible: true,
                      variants: [],
                      base_ingredients: []
                    }]
              };
            })
          : createDefaultComboForm().steps
      };

      setEditingCombo(combo);
      setComboForm(normalizedCombo);
      const initialSearch = {};
      (normalizedCombo.steps || []).forEach((_, index) => {
        initialSearch[index] = '';
      });
      setComboStepSearch(initialSearch);
    } else {
      resetComboForm();
    }

    setShowComboModal(true);
  };

  const handleCloseComboModal = () => {
    setShowComboModal(false);
    setTimeout(() => {
      resetComboForm();
    }, 200);
  };

  const updateComboField = (field, value) => {
    setComboForm((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const updateComboStep = (index, updater) => {
    setComboForm((prev) => {
      const steps = [...prev.steps];
      steps[index] = typeof updater === 'function' ? updater(steps[index]) : { ...steps[index], ...updater };
      return { ...prev, steps };
    });
  };

  const handleStepFieldChange = (index, field, value) => {
    updateComboStep(index, (step) => ({
      ...step,
      [field]: value
    }));
  };

  const handleAddComboStep = () => {
    setComboForm((prev) => {
      const newSteps = [
        ...prev.steps,
        {
          title: `Choix ${prev.steps.length + 1}`,
          description: '',
          min_selections: 1,
          max_selections: 1,
          options: []
        }
      ];
      return {
        ...prev,
        steps: newSteps
      };
    });
    const nextIndex = comboForm.steps.length;
    setComboStepSearch((prev) => ({
      ...prev,
      [nextIndex]: ''
    }));
  };

  // Récupérer toutes les sauces uniques des menus du restaurant
  const getAllRestaurantSauces = () => {
    const allSauces = new Map();
    (menu || []).forEach(menuItem => {
      if (menuItem.sauce_options && Array.isArray(menuItem.sauce_options)) {
        menuItem.sauce_options.forEach(sauce => {
          const sauceName = sauce.nom || sauce.name || '';
          if (sauceName && !allSauces.has(sauceName)) {
            allSauces.set(sauceName, {
              nom: sauceName,
              prix: parseFloat(sauce.prix || sauce.price || 0) || 0
            });
          }
        });
      }
    });

    // Si aucune sauce n'est trouvée dans les menus, utiliser des sauces par défaut
    return allSauces.size > 0 
      ? Array.from(allSauces.values())
      : [
          { nom: 'Blanche', prix: 0 },
          { nom: 'Algérienne', prix: 0 },
          { nom: 'Andalouse', prix: 0 },
          { nom: 'Barbecue', prix: 0 },
          { nom: 'Ketchup', prix: 0 },
          { nom: 'Mayonnaise', prix: 0 },
          { nom: 'Harissa', prix: 0 },
          { nom: 'Samouraï', prix: 0 }
        ];
  };

  // Ajouter les sauces comme variantes à une option spécifique (ex: frites)
  const handleAddSaucesAsVariants = (stepIndex, optionIndex) => {
    const sauces = getAllRestaurantSauces();
    
    updateComboStep(stepIndex, (step) => {
      const options = [...step.options];
      const option = { ...options[optionIndex] };
      
      // Ajouter les sauces comme variantes (ne pas dupliquer si elles existent déjà)
      const existingVariantNames = new Set((option.variants || []).map(v => v.nom));
      const newVariants = sauces
        .filter(sauce => !existingVariantNames.has(sauce.nom))
        .map((sauce, index) => ({
          nom: sauce.nom,
          description: '',
          prix_supplementaire: sauce.prix,
          is_default: false,
          disponible: true,
          ordre: (option.variants?.length || 0) + index
        }));
      
      option.variants = [...(option.variants || []), ...newVariants];
      options[optionIndex] = option;
      
      return { ...step, options };
    });
  };

  // Ajouter une étape "Sauces" avec les sauces proposées par le restaurant
  const handleAddSauceStep = () => {
    const defaultSauces = getAllRestaurantSauces();

    setComboForm((prev) => {
      const newSteps = [
        ...prev.steps,
        {
          title: 'Sauces',
          description: 'Choisissez vos sauces',
          min_selections: 1,
          max_selections: 3, // Par défaut, max 3 sauces
          options: defaultSauces.map((sauce, index) => ({
            type: 'custom',
            linked_menu_id: null,
            nom: sauce.nom,
            description: '',
            prix_supplementaire: sauce.prix,
            image_url: '',
            disponible: true,
            variants: [],
            base_ingredients: [],
            ordre: index
          }))
        }
      ];
      return {
        ...prev,
        steps: newSteps
      };
    });
    const nextIndex = comboForm.steps.length;
    setComboStepSearch((prev) => ({
      ...prev,
      [nextIndex]: ''
    }));
  };

  const handleRemoveComboStep = (index) => {
    setComboForm((prev) => {
      const newSteps = prev.steps.filter((_, stepIndex) => stepIndex !== index);
      return {
        ...prev,
        steps: newSteps
      };
    });
    setComboStepSearch((prev) => {
      const next = {};
      Object.entries(prev).forEach(([key, value]) => {
        const numericKey = parseInt(key, 10);
        if (numericKey < index) {
          next[numericKey] = value;
        } else if (numericKey > index) {
          next[numericKey - 1] = value;
        }
      });
      return next;
    });
  };

  const handleAddComboOption = (stepIndex) => {
    updateComboStep(stepIndex, (step) => ({
      ...step,
      options: [
        ...step.options,
        {
          type: 'link_to_item',
          linked_menu_id: '',
          nom: '',
          description: '',
          prix_supplementaire: '',
          image_url: '',
          disponible: true,
          variants: [],
          base_ingredients: []
        }
      ]
    }));
  };

  const handleRemoveComboOption = (stepIndex, optionIndex) => {
    updateComboStep(stepIndex, (step) => ({
      ...step,
      options: step.options.filter((_, idx) => idx !== optionIndex)
    }));
  };

  const handleComboOptionChange = (stepIndex, optionIndex, field, value) => {
    updateComboStep(stepIndex, (step) => {
      const options = [...step.options];
      const option = { ...options[optionIndex] };

      if (field === 'type') {
        option.type = value === 'custom' ? 'custom' : 'link_to_item';
        if (option.type === 'custom') {
          option.linked_menu_id = '';
          if (!option.nom) option.nom = '';
          option.base_ingredients = [];
        } else {
          option.linked_menu_id = '';
          option.nom = '';
          option.base_ingredients = [];
        }
      } else if (field === 'linked_menu_id') {
        option.linked_menu_id = value;
        if (option.type !== 'custom') {
          const linkedItem = menu.find((item) => item.id === value);
          if (linkedItem) {
            option.nom = linkedItem.nom;
            option.description = option.description || linkedItem.description || '';
            option.base_ingredients = Array.isArray(linkedItem.base_ingredients)
              ? linkedItem.base_ingredients.map((ingredient, ingredientIndex) => ({
                  id: ingredient.id || `ing-${linkedItem.id}-${ingredientIndex}`,
                  nom: ingredient.nom || '',
                  removable: ingredient.removable !== false,
                  prix_supplementaire:
                    ingredient?.prix_supplementaire !== undefined && ingredient?.prix_supplementaire !== null
                      ? ingredient.prix_supplementaire
                      : ingredient?.prix ?? 0,
                  ordre: ingredient.ordre ?? ingredientIndex
                }))
              : [];
          }
        }
      } else {
        option[field] = value;
      }

      options[optionIndex] = option;
      return { ...step, options };
    });
  };

  const handleAddExistingMenuAsOption = (stepIndex, menuItem) => {
    if (!menuItem) return;
    updateComboStep(stepIndex, (step) => {
      if (step.options.some((opt) => opt.type !== 'custom' && opt.linked_menu_id === menuItem.id)) {
        return step;
      }

      const baseIngredients = Array.isArray(menuItem.base_ingredients)
        ? menuItem.base_ingredients.map((ingredient, index) => ({
            id: ingredient.id || `ing-${menuItem.id}-${index}`,
            nom: ingredient.nom || '',
            removable: ingredient.removable !== false,
            prix_supplementaire: parseFloat(ingredient.prix_supplementaire ?? ingredient.prix ?? 0) || 0,
            ordre: ingredient.ordre ?? index
          }))
        : [];

      const newOption = {
        type: 'link_to_item',
        linked_menu_id: menuItem.id,
        nom: menuItem.nom || '',
        description: menuItem.description || '',
        prix_supplementaire: '',
        image_url: menuItem.image_url || '',
        disponible: menuItem.disponible !== false,
        variants: [],
        base_ingredients: baseIngredients
      };

      const filteredOptions = step.options.filter((opt) => {
        if (opt.type === 'link_to_item') {
          const hasLink = opt.linked_menu_id && opt.nom;
          return hasLink || opt.description || opt.prix_supplementaire;
        }
        return opt.nom || opt.description || opt.prix_supplementaire;
      });

      return {
        ...step,
        options: [...filteredOptions, newOption]
      };
    });
  };

  const handleAddCategoryItems = (stepIndex, items) => {
    (items || []).forEach((item) => {
      handleAddExistingMenuAsOption(stepIndex, item);
    });
  };

  const handleAddComboVariant = (stepIndex, optionIndex) => {
    updateComboStep(stepIndex, (step) => {
      const options = [...step.options];
      const option = { ...options[optionIndex] };
      option.variants = [
        ...(option.variants || []),
        {
          nom: `Variante ${option.variants.length + 1}`,
          description: '',
          prix_supplementaire: '',
          is_default: false,
          disponible: true
        }
      ];
      options[optionIndex] = option;
      return { ...step, options };
    });
  };

  const handleRemoveComboVariant = (stepIndex, optionIndex, variantIndex) => {
    updateComboStep(stepIndex, (step) => {
      const options = [...step.options];
      const option = { ...options[optionIndex] };
      option.variants = option.variants.filter((_, idx) => idx !== variantIndex);
      options[optionIndex] = option;
      return { ...step, options };
    });
  };

  const handleComboVariantChange = (stepIndex, optionIndex, variantIndex, field, value) => {
    updateComboStep(stepIndex, (step) => {
      const options = [...step.options];
      const option = { ...options[optionIndex] };
      const variants = [...(option.variants || [])];
      const variant = { ...variants[variantIndex], [field]: value };
      variants[variantIndex] = variant;
      option.variants = variants;
      options[optionIndex] = option;
      return { ...step, options };
    });
  };

  const buildComboPayload = () => {
    const stepsPayload = comboForm.steps.map((step, stepIndex) => {
      let min = parseInt(step.min_selections, 10);
      if (Number.isNaN(min) || min < 0) {
        min = 0;
      }

      let max = parseInt(step.max_selections, 10);
      if (Number.isNaN(max)) {
        max = min === 0 ? 0 : Math.max(min, 1);
      }
      if (max < 0) {
        max = 0;
      }
      if (max < min) {
        max = min;
      }

      return {
        title: step.title || `Étape ${stepIndex + 1}`,
        description: step.description || '',
        min_selections: min,
        max_selections: max,
        ordre: stepIndex,
        options: step.options.map((option, optionIndex) => {
          const isCustom = option.type === 'custom';
          const linkedId = isCustom ? null : option.linked_menu_id;
          let optionName = option.nom;
          if (!optionName) {
            if (!isCustom && linkedId) {
              const linkedItem = menu.find((item) => item.id === linkedId);
              optionName = linkedItem?.nom || `Option ${optionIndex + 1}`;
            } else {
              optionName = `Option ${optionIndex + 1}`;
            }
          }

          const priceValue = parseFloat(option.prix_supplementaire || '0');

          const baseIngredientsPayload = Array.isArray(option.base_ingredients)
            ? option.base_ingredients
                .filter((ingredient) => ingredient && (ingredient.nom || ingredient.name))
                .map((ingredient, ingredientIndex) => {
                  const ingredientName = ingredient.nom || ingredient.name || `Ingrédient ${ingredientIndex + 1}`;
                  const ingredientPrice = parseFloat(
                    ingredient.prix_supplementaire ?? ingredient.prix ?? '0'
                  );
                  return {
                    nom: ingredientName,
                    prix_supplementaire: Number.isNaN(ingredientPrice) ? 0 : ingredientPrice,
                    removable: ingredient.removable !== false,
                    ordre: ingredient.ordre ?? ingredientIndex
                  };
                })
            : [];

          return {
            type: isCustom ? 'custom' : 'link_to_item',
            linked_menu_id: isCustom ? null : linkedId,
            nom: optionName,
            description: option.description || '',
            prix_supplementaire: Number.isNaN(priceValue) ? 0 : priceValue,
            image_url: option.image_url || null,
            disponible: option.disponible !== false,
            ordre: optionIndex,
            base_ingredients: baseIngredientsPayload,
            variants: (option.variants || []).map((variant, variantIndex) => {
              const variantPrice = parseFloat(variant.prix_supplementaire || '0');
              return {
                nom: variant.nom || `Variante ${variantIndex + 1}`,
                description: variant.description || '',
                prix_supplementaire: Number.isNaN(variantPrice) ? 0 : variantPrice,
                is_default: variant.is_default === true,
                disponible: variant.disponible !== false,
                ordre: variantIndex
              };
            })
          };
        })
      };
    });

    const payload = {
      restaurant_id: restaurant?.id,
      user_email: userData?.email,
      nom: comboForm.nom,
      description: comboForm.description || '',
      prix_base: parseFloat(comboForm.prix_base || '0') || 0,
      actif: comboForm.actif !== false,
      ordre_affichage: parseInt(comboForm.ordre_affichage, 10) || 0,
      steps: stepsPayload
    };

    return payload;
  };

  const handleComboSubmit = async (event) => {
    event.preventDefault();

    if (!restaurant?.id) {
      alert('Restaurant introuvable. Veuillez actualiser la page.');
      return;
    }

    if (!userData?.email) {
      alert('Session utilisateur expirée. Veuillez vous reconnecter.');
      return;
    }

    if (!comboForm.nom.trim()) {
      alert('Le nom du menu composé est requis.');
      return;
    }

    if (!comboForm.steps.length || comboForm.steps.some((step) => !step.options.length)) {
      alert('Chaque étape doit contenir au moins une option.');
      return;
    }

    const payload = buildComboPayload();

    try {
      setSavingCombo(true);
      const endpoint = editingCombo
        ? `/api/partner/menu-combos/${editingCombo.id}`
        : '/api/partner/menu-combos';
      const method = editingCombo ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de l'enregistrement du menu composé");
      }

      await fetchCombos(restaurant.id);
      handleCloseComboModal();
    } catch (error) {
      console.error('Erreur sauvegarde menu composé:', error);
      alert(error.message || "Erreur lors de l'enregistrement du menu composé");
    } finally {
      setSavingCombo(false);
    }
  };

  const handleDeleteCombo = async (comboId) => {
    if (!comboId || !restaurant?.id) return;
    if (!userData?.email) {
      alert('Session utilisateur expirée. Veuillez vous reconnecter.');
      return;
    }

    const confirmation = window.confirm('Supprimer ce menu composé ? Cette action est irréversible.');
    if (!confirmation) return;

    try {
      setCombosLoading(true);
      const response = await fetch(`/api/partner/menu-combos/${comboId}?user_email=${encodeURIComponent(userData.email)}`, {
        method: 'DELETE'
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la suppression du menu composé');
      }

      await fetchCombos(restaurant.id);
    } catch (error) {
      console.error('Erreur suppression menu composé:', error);
      alert(error.message || 'Erreur lors de la suppression du menu composé');
    } finally {
      setCombosLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Popup quotidien: temps de préparation */}
      {showPrepTimeModal && restaurant?.id && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Temps de préparation du jour</h2>
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
              Indiquez un temps moyen de préparation. <strong>Vous pouvez le modifier ici à tout moment pendant le service</strong> si vous avez beaucoup de commandes.
            </p>

            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              Temps de préparation (minutes)
            </label>
            <select
              value={prepTimeMinutes}
              onChange={(e) => setPrepTimeMinutes(parseInt(e.target.value, 10))}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-xl px-4 py-3 mb-4"
            >
              {Array.from({ length: 24 }, (_, i) => (i + 1) * 5).map((m) => (
                <option key={m} value={m}>{m} min</option>
              ))}
            </select>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowPrepTimeModal(false)}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-semibold"
                disabled={savingPrepTime}
              >
                Plus tard
              </button>
              <button
                type="button"
                onClick={() => savePrepTime({ closeAfter: true })}
                className="flex-1 px-4 py-3 rounded-xl bg-orange-600 text-white font-semibold hover:bg-orange-700 disabled:opacity-50"
                disabled={savingPrepTime}
              >
                {savingPrepTime ? 'Enregistrement…' : 'Valider'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-2 fold:px-2 xs:px-3 sm:px-6 lg:px-8">
          <div className="flex flex-col space-y-2 fold:space-y-2 xs:space-y-4 py-2 fold:py-2 xs:py-4 sm:py-4">
            {/* Bouton retour et titre */}
            <div className="flex items-center justify-between w-full gap-2 fold:gap-2">
              <div className="flex items-center space-x-1.5 fold:space-x-1.5 xs:space-x-3 min-w-0 flex-1">
                <button
                  onClick={() => router.push('/')}
                  className="bg-blue-600 dark:bg-blue-700 text-white p-1.5 fold:p-1.5 xs:p-2 sm:p-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors flex items-center space-x-1 fold:space-x-1 xs:space-x-2 flex-shrink-0"
                  title="Retour à l'accueil"
                >
                  <FaArrowLeft className="h-4 w-4 fold:h-4 fold:w-4 xs:h-5 xs:w-5 sm:h-4 sm:w-4" />
                  <span className="text-xs fold:text-xs xs:text-sm sm:text-sm font-medium hidden fold:hidden xs:inline">Retour</span>
                </button>
                <div className="min-w-0 flex-1">
                  <h1 className="text-base fold:text-base xs:text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">Dashboard Partenaire</h1>
                  <p className="text-xs fold:text-xs xs:text-sm sm:text-base text-gray-600 dark:text-gray-300 truncate">{restaurant?.nom}</p>
                </div>
              </div>
            </div>
            
            {/* Boutons d'action - Responsive mobile et foldable */}
            <div className="grid grid-cols-3 fold:grid-cols-3 xs:grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-1 fold:gap-1 xs:gap-2 sm:gap-3 lg:gap-4">
              <button
                onClick={() => router.push('/partner/analytics')}
                className="bg-purple-600 text-white px-1 fold:px-1 xs:px-2 sm:px-3 lg:px-4 py-1.5 fold:py-1.5 xs:py-2 sm:py-2 rounded-lg hover:bg-purple-700 transition-colors flex flex-col items-center justify-center space-y-0.5 fold:space-y-0.5 xs:space-y-1 text-[10px] fold:text-[10px] xs:text-xs sm:text-sm font-medium"
              >
                <FaChartLine className="h-4 w-4 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Analytics</span>
                <span className="sm:hidden">Stats</span>
              </button>
              <button
                onClick={() => router.push('/partner/reports')}
                className="bg-green-600 text-white px-2 sm:px-3 lg:px-4 py-2 sm:py-2 rounded-lg hover:bg-green-700 transition-colors flex flex-col items-center justify-center space-y-1 text-xs sm:text-sm font-medium"
              >
                <FaFileAlt className="h-4 w-4 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Rapports</span>
                <span className="sm:hidden">Rapports</span>
              </button>
              <button
                onClick={() => router.push('/partner/hours')}
                className="bg-orange-600 text-white px-2 sm:px-3 lg:px-4 py-2 sm:py-2 rounded-lg hover:bg-orange-700 transition-colors flex flex-col items-center justify-center space-y-1 text-xs sm:text-sm font-medium"
              >
                <FaClock className="h-4 w-4 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Horaires</span>
                <span className="sm:hidden">Horaires</span>
              </button>
              <button
                onClick={toggleRestaurantClosed}
                className={`px-2 sm:px-3 lg:px-4 py-2 sm:py-2 rounded-lg transition-colors flex flex-col items-center justify-center space-y-1 text-xs sm:text-sm font-medium ${
                  isManuallyClosed === true
                    ? 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800'
                    : 'bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800'
                }`}
                title={isManuallyClosed === true ? 'Cliquez pour ouvrir le restaurant' : 'Cliquez pour fermer le restaurant'}
              >
                {isManuallyClosed === true ? (
                  <>
                    <FaCheck className="h-4 w-4 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Ouvrir</span>
                    <span className="sm:hidden">Ouvrir</span>
                  </>
                ) : (
                  <>
                    <FaTimes className="h-4 w-4 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Fermer</span>
                    <span className="sm:hidden">Fermer</span>
                  </>
                )}
              </button>

              {/* Temps de préparation (modifiable pendant le service) */}
              <button
                onClick={() => setShowPrepTimeModal(true)}
                className="bg-orange-500 text-white px-2 sm:px-3 lg:px-4 py-2 sm:py-2 rounded-lg hover:bg-orange-600 transition-colors flex flex-col items-center justify-center space-y-1 text-xs sm:text-sm font-medium"
                title="Modifier le temps de préparation (affiché aux clients)"
              >
                <FaClock className="h-4 w-4 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{prepTimeMinutes || 25} min</span>
                <span className="sm:hidden">{prepTimeMinutes || 25}m</span>
              </button>
              <button
                onClick={() => router.push('/partner/settings')}
                className="bg-gray-600 text-white px-2 sm:px-3 lg:px-4 py-2 sm:py-2 rounded-lg hover:bg-gray-700 transition-colors flex flex-col items-center justify-center space-y-1 text-xs sm:text-sm font-medium"
              >
                <svg className="h-4 w-4 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="hidden sm:inline">Paramètres</span>
                <span className="sm:hidden">Config</span>
              </button>
              {restaurant?.id && (
                <button
                  onClick={() => {
                    // Ouvrir la page restaurant dans un nouvel onglet pour voir comme un client
                    // Utiliser la route statique pour éviter les refresh en boucle dans l'app mobile (export statique)
                    window.open(`/restaurant-view?id=${encodeURIComponent(restaurant.id)}`, '_blank');
                  }}
                  className="bg-indigo-600 text-white px-2 sm:px-3 lg:px-4 py-2 sm:py-2 rounded-lg hover:bg-indigo-700 transition-colors flex flex-col items-center justify-center space-y-1 text-xs sm:text-sm font-medium"
                  title="Voir ma fiche établissement comme un client"
                >
                  <FaEye className="h-4 w-4 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Voir fiche</span>
                  <span className="sm:hidden">Voir</span>
                </button>
              )}
              <div className="flex justify-center">
                <RealTimeNotifications 
                  restaurantId={restaurant?.id} 
                  onOrderClick={() => {
                    // Ne pas réinitialiser les commandes, juste changer l'onglet
                    if (activeTab !== 'orders') {
                      setActiveTab('orders');
                    }
                    // Forcer le scroll vers le haut pour voir l'onglet
                    setTimeout(() => {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }, 100);
                    // Rafraîchir les commandes pour s'assurer qu'elles sont à jour
                    if (restaurant?.id) {
                      fetchOrders(restaurant.id);
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 sm:space-x-4 lg:space-x-8 overflow-x-auto pb-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-2 sm:py-3 lg:py-4 px-2 sm:px-3 lg:px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap rounded-t-lg ${
                activeTab === 'dashboard'
                  ? 'border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              data-tab="orders"
              className={`py-2 sm:py-3 lg:py-4 px-2 sm:px-3 lg:px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap rounded-t-lg ${
                activeTab === 'orders'
                  ? 'border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              Commandes
            </button>
            <button
              onClick={() => setActiveTab('menu')}
              className={`py-2 sm:py-3 lg:py-4 px-2 sm:px-3 lg:px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap rounded-t-lg ${
                activeTab === 'menu'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              Menu
            </button>
            <button
              onClick={() => setActiveTab('combos')}
              className={`py-2 sm:py-3 lg:py-4 px-2 sm:px-3 lg:px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap rounded-t-lg ${
                activeTab === 'combos'
                  ? 'border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              Menus composés
            </button>
            <button
              onClick={() => setActiveTab('formulas')}
              className={`py-2 sm:py-3 lg:py-4 px-2 sm:px-3 lg:px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap rounded-t-lg ${
                activeTab === 'formulas'
                  ? 'border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              Formules
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">

        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Section d'aide */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                    <FaFileAlt className="mr-2 text-blue-600 dark:text-blue-400" />
                    Guide d'utilisation du dashboard
                  </h2>
                  <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">📋 Gestion des commandes</h3>
                      <ul className="list-disc list-inside ml-2 space-y-1">
                        <li>Acceptez ou refusez les commandes depuis l'onglet "Commandes"</li>
                        <li>Indiquez le temps de préparation lors de l'acceptation</li>
                        <li>Marquez la commande comme "Prête" quand elle est prête à être livrée</li>
                        <li>Cliquez sur "Remise au livreur" quand vous remettez la commande au livreur</li>
                        <li>Vous pouvez retirer des ingrédients (viandes, sauces) si vous n'en avez plus</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">🍽️ Gestion du menu</h3>
                      <ul className="list-disc list-inside ml-2 space-y-1">
                        <li>Ajoutez, modifiez ou supprimez des plats depuis l'onglet "Menu"</li>
                        <li>Pour les tacos/kebabs : vous pouvez désactiver temporairement des viandes (ex: kebab) en décochant "Disponible" dans les options de viande</li>
                        <li>Les viandes désactivées n'apparaîtront plus pour les clients</li>
                        <li>Rendez un plat indisponible avec le bouton vert/rouge à côté de chaque plat</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">🕐 Ouverture/Fermeture</h3>
                      <ul className="list-disc list-inside ml-2 space-y-1">
                        <li>Utilisez le bouton "Ouvert/Fermé" en haut pour ouvrir ou fermer manuellement</li>
                        <li>Si vous fermez manuellement, vous resterez fermé jusqu'à ce que vous réouvriez manuellement</li>
                        <li>Si vous ouvrez manuellement, vous suivrez vos horaires d'ouverture normaux</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <FaUtensils className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Commandes aujourd'hui</p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.todayOrders}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                    <FaClock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">En attente</p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.pendingOrders}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <FaEuroSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Revenus aujourd'hui</p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {(stats.totalRevenue || 0).toFixed(2)} €
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <div className="p-6 border-b dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Commandes recentes</h2>
              </div>
              <div className="p-6">
                {!Array.isArray(stats?.recentOrders) || stats.recentOrders.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center">Aucune commande recente</p>
                ) : (
                  <div className="space-y-4">
                    {stats.recentOrders.map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-4 border dark:border-gray-700 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">Commande #{order.id}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {getSubtotal(order).toFixed(2)} €
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            order.statut === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            order.statut === 'accepted' ? 'bg-blue-100 text-blue-800' :
                            order.statut === 'ready' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                          }`}>
                            {order.statut}
                          </span>
                          <button
                            onClick={() => {
                              const fullOrder = orders.find(o => o.id === order.id) || order;
                              openAcceptModal(fullOrder);
                            }}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                          >
                            <FaCheck className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Message Partenaires - Partage Réseaux Sociaux - Version compacte APRÈS les commandes */}
            <div className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 rounded-lg shadow-lg p-4 text-white border-2 border-yellow-300">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <FaShareAlt className="h-6 w-6 text-yellow-300" />
                </div>
                <div className="flex-1">
                  <h4 className="text-base font-bold mb-1 flex items-center gap-2">
                    <FaInstagram className="h-4 w-4" />
                    <FaFacebook className="h-4 w-4" />
                    Partagez CVN'EAT sur vos réseaux sociaux !
                  </h4>
                  <p className="text-sm text-orange-50">
                    <strong className="text-yellow-300">Boostez vos ventes</strong> et <strong className="text-yellow-300">montez dans le classement</strong> ! Les restaurants qui partagent le plus apparaissent <strong className="text-white">EN HAUT</strong>, les autres <strong className="text-red-200">EN BAS</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        {showAcceptModal && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-3">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Accepter la commande</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Indiquez le temps de préparation estimé pour cette commande.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Temps de préparation (minutes)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="90"
                    value={timeEstimation.preparationTime}
                    onChange={(e) => handleTimeEstimationChange('preparationTime', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-sm text-blue-900">
                    <span className="font-medium">Note :</span> Le temps de livraison sera défini par le livreur lors de l'acceptation de la commande.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowAcceptModal(false);
                    setSelectedOrder(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAcceptOrderSubmit}
                  disabled={acceptingOrder}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {acceptingOrder ? 'Acceptation...' : 'Accepter'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showRejectModal && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-3">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Refuser la commande</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Indiquez la raison du refus (visible par le client).
                </p>
              </div>

              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Exemple : Rupture de stock, restaurant fermé..."
              />

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason('');
                    setSelectedOrder(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleRejectOrderSubmit}
                  disabled={rejectingOrder}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {rejectingOrder ? 'Refus...' : 'Refuser'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showDelayModal && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-3">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Indiquer un retard</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Ajoutez des minutes supplémentaires au temps de préparation estimé.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minutes supplémentaires à ajouter
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={delayMinutes}
                  onChange={(e) => setDelayMinutes(Math.max(1, parseInt(e.target.value) || 5))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Temps actuel : {selectedOrder.preparation_time || 15} min → Nouveau temps : {(selectedOrder.preparation_time || 15) + delayMinutes} min
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowDelayModal(false);
                    setDelayMinutes(5);
                    setSelectedOrder(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAddDelay}
                  disabled={updatingDelay}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                >
                  {updatingDelay ? 'Mise à jour...' : 'Ajouter le retard'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-6">
            {/* Statistiques des commandes */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <FaUtensils className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total commandes</p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">{Array.isArray(orders) ? orders.length : 0}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                    <FaClock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">En attente</p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.pendingOrders}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <FaEuroSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Chiffre d'affaires</p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {(stats.totalRevenue || 0).toFixed(2)} €
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <FaEuroSign className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Vos gains (80%)</p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {((stats.totalRevenue || 0) * 0.8).toFixed(2)} €
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Liste des commandes */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <div className="p-6 border-b dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Gestion des commandes</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  Gérez vos commandes et calculez vos gains (CVN'EAT prélève 20% de commission)
                </p>
              </div>
              <div className="p-6">
                {!Array.isArray(orders) || orders.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">Aucune commande pour le moment</p>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {orders.map((order) => {
                      // IMPORTANT: Utiliser getSubtotal() qui recalcule depuis details_commande
                      // Ne pas utiliser order.total qui peut être incorrect pour les anciennes commandes
                      // getSubtotal() inclut correctement les suppléments, boissons, etc.
                      const totalAmount = getSubtotal(order); // Recalculé depuis details_commande
                      const deliveryFee = parseFloat(order.frais_livraison || 0) || 0;
                      // Ne PAS ajouter les frais de livraison pour l'affichage côté restaurant
                      // Le total affiché est uniquement le montant des articles
                      
                      // Log pour déboguer si le total diffère
                      const storedTotal = parseFloat(order.total || 0);
                      if (Math.abs(totalAmount - storedTotal) > 0.01) {
                        console.warn(`⚠️ Commande ${order.id?.slice(0, 8)}: Total stocké (${storedTotal}€) ≠ Total calculé (${totalAmount}€)`);
                        console.warn(`   Détails:`, order.details_commande?.map(d => ({
                          nom: d.menus?.nom,
                          prix_unitaire: d.prix_unitaire,
                          quantite: d.quantite,
                          total: d.prix_unitaire * d.quantite
                        })));
                      }
                      
                      const { commission, restaurantRevenue } = calculateCommission(totalAmount);
                      
                      return (
                        <div key={order.id} className="border dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow bg-gray-50 dark:bg-gray-800">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <h3 className="font-medium text-gray-900 dark:text-white text-lg">Commande #{order.id?.slice(0, 8) || order.id}</h3>
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                {order.created_at ? new Date(order.created_at).toLocaleString('fr-FR') : 'Date non disponible'}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                Client: {
                                  // Priorité 1: users avec prénom ET nom (évite "Utilisateur" si c'est juste le nom)
                                  (order.users?.prenom && order.users?.nom && order.users.nom !== 'Utilisateur') 
                                    ? `${order.users.prenom} ${order.users.nom}`.trim()
                                    // Priorité 2: customer_name formaté depuis l'API
                                    : order.customer_name && order.customer_name !== 'Utilisateur'
                                    ? order.customer_name
                                    // Priorité 3: customer object
                                    : (order.customer?.firstName && order.customer?.lastName)
                                    ? `${order.customer.firstName} ${order.customer.lastName}`.trim()
                                    // Priorité 4: users.nom seul (si pas "Utilisateur")
                                    : order.users?.nom && order.users.nom !== 'Utilisateur'
                                    ? order.users.nom
                                    // Priorité 5: customer_lastName
                                    : order.customer?.lastName && order.customer.lastName !== 'Utilisateur'
                                    ? order.customer.lastName
                                    // Fallback final
                                    : 'Client'
                                }
                              </p>
                              {getCustomerPhone(order) && (
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                  <span className="font-medium">Téléphone :</span>{' '}
                                  <a 
                                    href={`tel:${getCustomerPhone(order)}`}
                                    className="text-blue-600 dark:text-blue-400 hover:underline"
                                  >
                                    {getCustomerPhone(order)}
                                  </a>
                                </p>
                              )}
                              {/* Afficher les frais de livraison séparément (pour info, mais pas dans le total) */}
                              {deliveryFee > 0 && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  Frais de livraison: {deliveryFee.toFixed(2)} € (livreur)
                                </p>
                              )}
                              {/* Afficher le temps de livraison défini par le livreur */}
                              {order.delivery_time && (
                                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mt-2">
                                  <FaMotorcycle className="inline mr-1" />
                                  Temps de livraison: {order.delivery_time} min
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              {totalAmount > 0 ? (
                                <>
                                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {totalAmount.toFixed(2)} €
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Commission CVN'EAT (20%): {commission.toFixed(2)} €
                                  </p>
                                  <p className="text-sm font-medium text-green-600 dark:text-green-400">
                                    Votre gain (80%): {restaurantRevenue.toFixed(2)} €
                                  </p>
                                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                    Total client: {(totalAmount + deliveryFee).toFixed(2)} €
                                  </p>
                                </>
                              ) : (
                                <p className="text-sm text-gray-500 dark:text-gray-400">Prix non disponible</p>
                              )}
                            </div>
                          </div>
                          
                          {/* Articles de la commande */}
                          {(() => {
                            // Prioriser order_items, puis items, puis details_commande
                            const items = order.order_items || order.items || order.details_commande || [];
                            return Array.isArray(items) && items.length > 0;
                          })() && (
                            <div className="mt-4 p-3 bg-white dark:bg-gray-700 rounded border dark:border-gray-600">
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Articles commandés :</p>
                              <div className="space-y-2">
                                {(() => {
                                  const allDetails = order.order_items || order.items || order.details_commande || [];
                                  
                                  // FILTRER: Exclure les items qui font partie d'une formule (is_formula_drink, is_formula_item)
                                  // Ils seront affichés dans la formule principale via formula_items_details et selected_drink
                                  const filteredDetails = allDetails.filter(detail => {
                                    let customizations = {};
                                    if (detail.customizations) {
                                      if (typeof detail.customizations === 'string') {
                                        try {
                                          customizations = JSON.parse(detail.customizations);
                                        } catch (e) {
                                          customizations = {};
                                        }
                                      } else {
                                        customizations = detail.customizations;
                                      }
                                    }
                                    
                                    // Exclure les boissons de formule et les items de formule (ils sont dans formula_items_details)
                                    return !customizations.is_formula_drink && !customizations.is_formula_item;
                                  });
                                  
                                  return filteredDetails.map((detail, index) => {
                                  // Gérer les deux formats : order_items/items (name, quantity, price) ou details_commande (menus.nom, quantite, prix_unitaire)
                                  const menu = detail.menus || {};
                                  
                                  // Parser les customisations
                                  let customizations = {};
                                  if (detail.customizations) {
                                    if (typeof detail.customizations === 'string') {
                                      try {
                                        customizations = JSON.parse(detail.customizations);
                                      } catch (e) {
                                        customizations = {};
                                      }
                                    } else {
                                      customizations = detail.customizations;
                                    }
                                  }
                                  
                                  // CRITIQUE: Si c'est une formule, utiliser le nom de la formule, pas le nom du menu burger
                                  const isFormula = customizations.is_formula === true;
                                  const nom = isFormula 
                                    ? (customizations.formula_name || 'Formule')
                                    : (detail.name || menu.nom || 'Article inconnu');
                                  
                                  const quantite = detail.quantity || detail.quantite || 1;
                                  const prixUnitaire = detail.price || detail.prix_unitaire || menu.prix || 0;
                                  const prixTotal = prixUnitaire * quantite;
                                  
                                  // Parser les suppléments
                                  let supplements = [];
                                  if (detail.supplements) {
                                    if (typeof detail.supplements === 'string') {
                                      try {
                                        supplements = JSON.parse(detail.supplements);
                                      } catch (e) {
                                        supplements = [];
                                      }
                                    } else if (Array.isArray(detail.supplements)) {
                                      supplements = detail.supplements;
                                    }
                                  }
                                  
                                  return (
                                    <div key={detail.id || index} className="border-b dark:border-gray-600 pb-2 last:border-0">
                                      <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-600 dark:text-gray-300 font-medium">
                                          {quantite}x {nom}
                                          {isFormula && <span className="ml-2 text-purple-600 dark:text-purple-400">🍔 Menu</span>}
                                        </span>
                                        <span className="text-gray-900 dark:text-white font-medium">
                                          {prixTotal.toFixed(2)} €
                                        </span>
                                      </div>
                                      
                                      {/* Suppléments */}
                                      {supplements.length > 0 && (
                                        <div className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                          <span className="font-medium">Suppléments:</span>
                                          <ul className="list-disc list-inside ml-1">
                                            {supplements.map((sup, supIdx) => (
                                              <li key={supIdx}>
                                                {sup.nom || sup.name} {(sup.prix || sup.price) > 0 && `(+${(sup.prix || sup.price || 0).toFixed(2)}€)`}
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                      
                                      {/* Viandes sélectionnées */}
                                      {customizations.selectedMeats && Array.isArray(customizations.selectedMeats) && customizations.selectedMeats.length > 0 && (
                                        <div className={`mt-1 pt-1 border-t border-gray-200 dark:border-gray-600 text-xs ml-2 ${isFormula ? 'text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                          <div className={`font-semibold ${isFormula ? 'text-orange-600 dark:text-orange-400' : ''}`}>Viandes :</div>
                                          {customizations.selectedMeats.map((meat, meatIdx) => {
                                            const meatId = meat.id || meat.nom || meat.name || '';
                                            return (
                                              <div key={meatIdx} className={`flex items-center justify-between ${isFormula ? 'text-orange-600 dark:text-orange-400' : ''}`}>
                                                <span>🥩 {meat.nom || meat.name || 'Viande'} {(meat.prix || meat.price) > 0 && `(+${(meat.prix || meat.price || 0).toFixed(2)}€)`}</span>
                                                {(order.statut === 'en_attente' || (order.statut === 'en_preparation' && detail.id)) ? (
                                                  <button
                                                    onClick={() => handleRemoveIngredient(order.id, detail.id, meatId, 'meat')}
                                                    className="ml-2 text-xs bg-red-500 text-white px-2 py-0.5 rounded hover:bg-red-600 transition-colors"
                                                    title="Retirer cette viande"
                                                  >
                                                    Retirer
                                                  </button>
                                                ) : null}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                      
                                      {/* Sauces sélectionnées */}
                                      {customizations.selectedSauces && Array.isArray(customizations.selectedSauces) && customizations.selectedSauces.length > 0 && (
                                        <div className={`mt-1 pt-1 border-t border-gray-200 dark:border-gray-600 text-xs ml-2 ${isFormula ? 'text-teal-600 dark:text-teal-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                          <div className={`font-semibold ${isFormula ? 'text-teal-600 dark:text-teal-400' : ''}`}>Sauces :</div>
                                          {customizations.selectedSauces.map((sauce, sauceIdx) => {
                                            const sauceId = sauce.id || sauce.nom || sauce.name || '';
                                            return (
                                              <div key={sauceIdx} className={`flex items-center justify-between ${isFormula ? 'text-teal-600 dark:text-teal-400' : ''}`}>
                                                <span>🧂 {sauce.nom || sauce.name || 'Sauce'} {(sauce.prix || sauce.price) > 0 && `(+${(sauce.prix || sauce.price || 0).toFixed(2)}€)`}</span>
                                                {(order.statut === 'en_attente' || (order.statut === 'en_preparation' && detail.id)) ? (
                                                  <button
                                                    onClick={() => handleRemoveIngredient(order.id, detail.id, sauceId, 'sauce')}
                                                    className="ml-2 text-xs bg-red-500 text-white px-2 py-0.5 rounded hover:bg-red-600 transition-colors"
                                                    title="Retirer cette sauce"
                                                  >
                                                    Retirer
                                                  </button>
                                                ) : null}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                      
                                      {/* Ingrédients retirés */}
                                      {customizations.removedIngredients && Array.isArray(customizations.removedIngredients) && customizations.removedIngredients.length > 0 && (
                                        <div className="mt-1 pt-1 border-t border-gray-200 dark:border-gray-600 text-xs text-orange-600 dark:text-orange-400 ml-2">
                                          <div className="font-semibold">Ingrédients retirés :</div>
                                          {customizations.removedIngredients.map((ing, ingIdx) => (
                                            <div key={ingIdx} className="line-through">❌ {ing.nom || ing.name || 'Ingrédient'}</div>
                                          ))}
                                        </div>
                                      )}
                                      
                                      {/* Boisson de menu (pour les menus non-formule) */}
                                      {!isFormula && customizations.is_menu_drink === true && (
                                        <div className="text-xs text-blue-600 dark:text-blue-400 ml-2">
                                          <span className="font-medium">🥤 Boisson (menu):</span> {nom}
                                          {customizations.menu_name && (
                                            <span className="text-gray-500"> - {customizations.menu_name}</span>
                                          )}
                                        </div>
                                      )}
                                      
                                      {/* Détails de la formule (burger, frites, boisson) */}
                                      {isFormula && customizations.formula_items_details && Array.isArray(customizations.formula_items_details) && customizations.formula_items_details.length > 0 && (
                                        <div className="text-xs text-gray-600 dark:text-gray-300 ml-2 mt-1">
                                          <span className="font-medium">Contenu de la formule:</span>
                                          <ul className="list-disc list-inside ml-1">
                                            {customizations.formula_items_details.map((fi, fiIdx) => (
                                              <li key={fiIdx}>
                                                {fi.nom || fi.name || 'Article'} {fi.quantity > 1 ? `x${fi.quantity}` : ''}
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                      
                                      {/* Boisson sélectionnée dans la formule */}
                                      {isFormula && customizations.selected_drink && (
                                        <div className="mt-1 pt-1 border-t border-gray-200 dark:border-gray-600 text-xs text-blue-600 dark:text-blue-400 ml-2">
                                          <span className="font-semibold">🥤 Boisson (formule):</span> {customizations.selected_drink.nom || customizations.selected_drink.name || 'Boisson'}
                                        </div>
                                      )}
                                    </div>
                                  );
                                });
                                })()}
                              </div>
                            </div>
                          )}
                          {(() => {
                            // Vérifier order_items, items, et details_commande
                            const hasItems = (order.order_items && Array.isArray(order.order_items) && order.order_items.length > 0) ||
                                           (order.items && Array.isArray(order.items) && order.items.length > 0) ||
                                           (order.details_commande && Array.isArray(order.details_commande) && order.details_commande.length > 0);
                            
                            // Log pour debug si pas de détails
                            if (!hasItems) {
                              console.warn('⚠️ Détails non disponibles pour commande', order.id, {
                                hasOrderItems: !!(order.order_items && order.order_items.length > 0),
                                hasItems: !!(order.items && order.items.length > 0),
                                hasDetailsCommande: !!(order.details_commande && order.details_commande.length > 0),
                                orderItems: order.order_items,
                                items: order.items,
                                details_commande: order.details_commande
                              });
                            }
                            
                            return !hasItems;
                          })() && (
                            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900 rounded border border-yellow-200 dark:border-yellow-700">
                              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                ⚠️ Détails de commande non disponibles
                              </p>
                              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                                Commande #{order.id?.slice(0, 8)} - Rechargement en cours...
                              </p>
                            </div>
                          )}
                          
                          {/* Informations du livreur */}
                          {order.delivery_driver && order.delivery_driver.full_name && (
                            <div className="mt-4 p-3 bg-green-50 dark:bg-green-900 rounded border border-green-200 dark:border-green-700">
                              <h4 className="text-sm font-semibold text-green-900 dark:text-green-200 mb-2">🚴 Livreur assigné</h4>
                              <div className="space-y-1">
                                <p className="text-sm text-green-800 dark:text-green-300">
                                  <span className="font-medium">Nom :</span> {order.delivery_driver.full_name}
                                </p>
                                {order.delivery_driver.telephone && order.delivery_driver.telephone !== '0000000000' && order.delivery_driver.telephone.trim() !== '' && (
                                  <p className="text-sm text-green-800 dark:text-green-300">
                                    <span className="font-medium">Téléphone :</span>{' '}
                                    <a 
                                      href={`tel:${order.delivery_driver.telephone}`}
                                      className="text-green-700 dark:text-green-400 hover:underline"
                                    >
                                      {order.delivery_driver.telephone}
                                    </a>
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Timer préparation */}
                          {((order.statut === 'en_preparation') || (order.statut === 'en_livraison' && !order.ready_for_delivery)) && order.preparation_time && (
                            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900 rounded border border-blue-200 dark:border-blue-700">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                                    ⏱️ Temps de préparation estimé : {order.preparation_time} min
                                  </p>
                                  {order.livreur_id && !order.ready_for_delivery && (
                                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                                      Un livreur a déjà accepté la course – marquez la commande comme prête dès qu'elle l'est.
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-3">
                                  <OrderCountdown order={order} />
                                  <button
                                    onClick={() => openDelayModal(order)}
                                    className="px-3 py-1.5 text-xs bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors whitespace-nowrap"
                                  >
                                    ⏰ Ajouter du temps
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Statut et actions */}
                          <div className="mt-4 pt-3 border-t border-gray-200">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                {(() => {
                                  const isAwaiting = order.statut === 'en_attente';
                                  const isPreparing = (order.statut === 'en_preparation') || (order.statut === 'en_livraison' && !order.ready_for_delivery);
                                  const isReady = (order.statut === 'en_preparation' || order.statut === 'en_livraison') && order.ready_for_delivery;
                                  const isDelivering = order.statut === 'en_livraison' && order.ready_for_delivery;
                                  const isDelivered = order.statut === 'livree';
                                  const isCancelled = order.statut === 'annulee';

                                  let badgeClass = 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
                                  if (isAwaiting) badgeClass = 'bg-yellow-100 text-yellow-800';
                                  else if (isPreparing) badgeClass = 'bg-blue-100 text-blue-800';
                                  else if (isReady) badgeClass = 'bg-green-100 text-green-800';
                                  else if (isDelivering) badgeClass = 'bg-purple-100 text-purple-800';
                                  else if (isDelivered) badgeClass = 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
                                  else if (isCancelled) badgeClass = 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';

                                  let label = 'Inconnu';
                                  if (isAwaiting) label = 'En attente';
                                  else if (isPreparing) label = 'En préparation';
                                  else if (isReady && !isDelivering) label = 'Prête';
                                  else if (isDelivering) label = 'En livraison';
                                  else if (isDelivered) label = 'Livrée';
                                  else if (isCancelled) label = 'Annulée';
                                  else if (order.statut) label = order.statut;

                                  return (
                                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${badgeClass}`}>
                                      {label}
                                    </span>
                                  );
                                })()}
                              </div>
                              
                              <div className="flex flex-wrap gap-2 justify-end">
                                {order.statut === 'en_attente' && (
                                  <>
                                    <button
                                      onClick={() => openAcceptModal(order)}
                                      className="bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 transition-colors"
                                    >
                                      Accepter
                                    </button>
                                    <button
                                      onClick={() => openRejectModal(order)}
                                      className="bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700 transition-colors"
                                    >
                                      Refuser
                                    </button>
                                  </>
                                )}
                                {/* Permettre de marquer comme prête même si un livreur a accepté */}
                                {/* Afficher le bouton "Marquer comme prête" si la commande est en préparation et pas encore prête */}
                                {(order.statut === 'en_preparation' || order.statut === 'en_attente') && !order.ready_for_delivery && (
                                  <button
                                    onClick={() => updateOrderStatus(order.id, 'pret_a_livrer')}
                                    className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition-colors"
                                    disabled={false}
                                    title="Marquer la commande comme prête pour la livraison"
                                  >
                                    Marquer comme prête
                                  </button>
                                )}
                                
                                {/* Afficher "Prête" et bouton "Remise au livreur" si la commande est prête mais pas encore en livraison */}
                                {order.ready_for_delivery && order.statut !== 'en_livraison' && order.statut !== 'livree' && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-green-600 dark:text-green-400 px-3 py-2 font-medium">
                                      ✓ Prête pour livraison
                                    </span>
                                    {order.livreur_id && (
                                      <button
                                        onClick={() => updateOrderStatus(order.id, 'en_livraison')}
                                        className="bg-purple-600 text-white px-3 py-2 rounded text-sm hover:bg-purple-700 transition-colors"
                                        title="Cliquez quand le livreur récupère la commande"
                                      >
                                        Remise au livreur
                                      </button>
                                    )}
                                    {!order.livreur_id && (
                                      <span className="text-xs text-gray-500 dark:text-gray-400">
                                        En attente d'un livreur
                                      </span>
                                    )}
                                  </div>
                                )}
                                {order.statut === 'en_livraison' && order.livreur_id && order.ready_for_delivery && (
                                  <span className="text-sm text-purple-600 dark:text-purple-400 px-3 py-2 font-medium">
                                    ✓ En livraison
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'formulas' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Gestion des formules</h2>
              <button
                onClick={() => {
                  setEditingFormula(null);
                  setFormulaForm({
                    nom: '',
                    description: '',
                    prix: '',
                    prix_reduit: '',
                    image_url: '',
                    disponible: true,
                    menu_items: []
                  });
                  setShowFormulaModal(true);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Créer une formule
              </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <div className="p-6">
                {!Array.isArray(formulas) || formulas.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center">Aucune formule créée</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {formulas.map((formula) => {
                      const totalPrice = formula.items?.reduce((sum, item) => {
                        const itemPrice = item.menu?.prix || 0;
                        const quantity = item.quantity || 1;
                        return sum + (itemPrice * quantity);
                      }, 0) || 0;
                      const savings = formula.prix_reduit ? (totalPrice - formula.prix) : 0;

                      return (
                        <div key={formula.id} className="border dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-700 shadow-sm hover:shadow-md transition-shadow">
                          {formula.image_url && (
                            <img 
                              src={formula.image_url} 
                              alt={formula.nom}
                              className="w-full h-32 object-cover rounded-lg mb-3"
                            />
                          )}
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white">{formula.nom}</h3>
                            <div className="flex space-x-1">
                              <button
                                onClick={() => {
                                  setEditingFormula(formula);
                                  setFormulaForm({
                                    nom: formula.nom,
                                    description: formula.description || '',
                                    prix: formula.prix,
                                    prix_reduit: formula.prix_reduit || '',
                                    image_url: formula.image_url || '',
                                    disponible: formula.disponible !== false,
                                    menu_items: (formula.items || []).map(item => ({
                                      menu_id: item.menu?.id,
                                      order_index: item.order_index,
                                      quantity: item.quantity || 1
                                    }))
                                  });
                                  setShowFormulaModal(true);
                                }}
                                className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                              >
                                <FaEdit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteFormula(formula.id)}
                                className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                              >
                                <FaTrash className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">{formula.description}</p>
                          <div className="space-y-1 mb-2">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Composée de:</p>
                            {formula.items?.map((item, idx) => (
                              <div key={idx} className="text-xs text-gray-600 dark:text-gray-300">
                                • {item.quantity || 1}x {item.menu?.nom || 'Plat inconnu'}
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-lg font-bold text-green-600">{formula.prix}€</p>
                              {formula.prix_reduit && savings > 0 && (
                                <p className="text-xs text-gray-500 line-through">{totalPrice.toFixed(2)}€</p>
                              )}
                              {savings > 0 && (
                                <p className="text-xs text-green-600">Économie: {savings.toFixed(2)}€</p>
                              )}
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              formula.disponible ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {formula.disponible ? 'Disponible' : 'Indisponible'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'menu' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Gestion du menu</h2>
              <button
                onClick={() => {
                  setEditingMenu(null);
                  setMenuForm(createDefaultMenuForm());
                  setShowMenuModal(true);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Ajouter un plat
              </button>
            </div>

            {/* Sections affichées au client (Entrées / Plats / Desserts / ...) */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Sections visibles côté client</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Ces sections correspondent aux titres affichés sur la fiche établissement (ex: Entrées, Plats, Desserts…).
                      Tu peux les ajouter/renommer/réordonner.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => restaurant?.id && fetchMenuSections(restaurant.id)}
                    disabled={!restaurant?.id || sectionsLoading}
                    className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                  >
                    {sectionsLoading ? '...' : 'Rafraîchir'}
                  </button>
                </div>

                {/* Ajout */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    value={newSectionName}
                    onChange={(e) => setNewSectionName(e.target.value)}
                    placeholder="Nom de section (ex: Entrées)"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <input
                    value={newSectionDescription}
                    onChange={(e) => setNewSectionDescription(e.target.value)}
                    placeholder="Description (optionnel)"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={createMenuSection}
                    disabled={sectionsLoading || !restaurant?.id}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    Ajouter la section
                  </button>
                </div>

                {/* Liste */}
                {Array.isArray(menuSections) && menuSections.length > 0 ? (
                  <div className="space-y-2">
                    {menuSections
                      .slice()
                      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
                      .map((section, idx) => {
                        const isEditing = editingSection?.id === section.id;
                        return (
                          <div
                            key={section.id}
                            className="flex flex-col md:flex-row md:items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                          >
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => moveMenuSection(section.id, 'up')}
                                disabled={sectionsLoading || idx === 0}
                                className="px-2 py-1 rounded border border-gray-200 dark:border-gray-700 text-sm disabled:opacity-40"
                                title="Monter"
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                onClick={() => moveMenuSection(section.id, 'down')}
                                disabled={sectionsLoading || idx === menuSections.length - 1}
                                className="px-2 py-1 rounded border border-gray-200 dark:border-gray-700 text-sm disabled:opacity-40"
                                title="Descendre"
                              >
                                ↓
                              </button>
                            </div>

                            <div className="flex-1 min-w-0">
                              {isEditing ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  <input
                                    value={editingSection.name || ''}
                                    onChange={(e) => setEditingSection({ ...editingSection, name: e.target.value })}
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                  />
                                  <input
                                    value={editingSection.description || ''}
                                    onChange={(e) => setEditingSection({ ...editingSection, description: e.target.value })}
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="Description"
                                  />
                                </div>
                              ) : (
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white truncate">{section.name}</p>
                                  {section.description ? (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{section.description}</p>
                                  ) : null}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={saveEditedMenuSection}
                                    disabled={sectionsLoading}
                                    className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50"
                                  >
                                    Enregistrer
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingSection(null)}
                                    className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                                  >
                                    Annuler
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setEditingSection({ ...section, oldName: section?.name || '' })}
                                    className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                                  >
                                    Renommer
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => deleteMenuSection(section)}
                                    className="px-3 py-2 rounded-lg border border-red-200 text-red-700 text-sm hover:bg-red-50"
                                  >
                                    Supprimer
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Aucune section personnalisée pour le moment. Tu peux en créer ci-dessus (ou utiliser les sections par défaut).
                  </p>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <div className="p-6">
                {!Array.isArray(menu) || menu.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center">Aucun plat dans le menu</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                    {menu.map((item) => (
                      <div key={item.id} className="border dark:border-gray-700 rounded-lg p-2 sm:p-3 bg-white dark:bg-gray-700 shadow-sm hover:shadow-md transition-shadow">
                        {/* Image du plat */}
                        <div className="mb-2">
                          {item.image_url ? (
                            <img 
                              src={item.image_url} 
                              alt={item.nom}
                              className="w-full h-20 object-cover rounded-lg"
                            />
                          ) : (
                            <div className="w-full h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                              <span className="text-gray-500 dark:text-gray-400 text-xs">Pas d'image</span>
                            </div>
                          )}
                          
                          {/* Upload d'image */}
                          <div className="mt-1 space-y-1">
                            <div className="flex gap-1">
                              <input
                                id={`menu-item-url-${item.id}`}
                                type="url"
                                placeholder="URL image"
                                className="flex-1 text-xs border border-gray-300 rounded px-1 py-1"
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleImageUrlUpload(e.target.value, item.id);
                                  }
                                }}
                              />
                              <button
                                onClick={() => {
                                  const input = document.querySelector(`#menu-item-url-${item.id}`);
                                  if (input && input.value) {
                                    handleImageUrlUpload(input.value, item.id);
                                  }
                                }}
                                className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700"
                              >
                                ✓
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="font-medium text-gray-900 dark:text-white text-sm truncate">{item.nom}</h3>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleToggleMenuAvailability(item)}
                              className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors ${
                                item.disponible ? 'text-green-600' : 'text-red-600'
                              }`}
                              title={item.disponible ? 'Rendre le plat indisponible' : 'Rendre le plat disponible'}
                            >
                              {item.disponible ? <FaCheck className="h-3.5 w-3.5" /> : <FaTimes className="h-3.5 w-3.5" />}
                            </button>
                            <button
                              onClick={() => {
                                setEditingMenu(item);
                                // Parser les suppléments si c'est une chaîne JSON
                                let parsedSupplements = [];
                                if (item.supplements) {
                                  if (typeof item.supplements === 'string') {
                                    try {
                                      parsedSupplements = JSON.parse(item.supplements);
                                    } catch (e) {
                                      parsedSupplements = [];
                                    }
                                  } else if (Array.isArray(item.supplements)) {
                                    parsedSupplements = item.supplements;
                                  }
                                }
                                // Parser les options de customisation
                                let parsedMeatOptions = [];
                                if (item.meat_options) {
                                  if (typeof item.meat_options === 'string') {
                                    try {
                                      parsedMeatOptions = JSON.parse(item.meat_options);
                                    } catch (e) {
                                      parsedMeatOptions = [];
                                    }
                                  } else if (Array.isArray(item.meat_options)) {
                                    parsedMeatOptions = item.meat_options;
                                  }
                                }

                                let parsedSauceOptions = [];
                                if (item.sauce_options) {
                                  if (typeof item.sauce_options === 'string') {
                                    try {
                                      parsedSauceOptions = JSON.parse(item.sauce_options);
                                    } catch (e) {
                                      parsedSauceOptions = [];
                                    }
                                  } else if (Array.isArray(item.sauce_options)) {
                                    parsedSauceOptions = item.sauce_options;
                                  }
                                }

                                let parsedBaseIngredients = [];
                                if (item.base_ingredients) {
                                  if (typeof item.base_ingredients === 'string') {
                                    try {
                                      parsedBaseIngredients = JSON.parse(item.base_ingredients);
                                    } catch (e) {
                                      parsedBaseIngredients = [];
                                    }
                                  } else if (Array.isArray(item.base_ingredients)) {
                                    parsedBaseIngredients = item.base_ingredients;
                                  }
                                }

                                setMenuForm({
                                  ...item,
                                  supplements: parsedSupplements,
                                  boisson_taille: item.drink_size || item.boisson_taille || '',
                                  prix_taille: item.prix_taille || '',
                                  meat_options: parsedMeatOptions,
                                  sauce_options: parsedSauceOptions,
                                  base_ingredients: parsedBaseIngredients,
                                  requires_meat_selection: item.requires_meat_selection || false,
                                  requires_sauce_selection: item.requires_sauce_selection || false,
                                  // Gérer explicitement 0 (sauces déjà comprises) vs null (illimité)
                                  max_sauces: (item.max_sauces !== null && item.max_sauces !== undefined) 
                                    ? item.max_sauces 
                                    : ((item.max_sauce_count !== null && item.max_sauce_count !== undefined) 
                                        ? item.max_sauce_count 
                                        : null),
                                  max_meats: (item.max_meats !== null && item.max_meats !== undefined) 
                                    ? item.max_meats 
                                    : ((item.max_meat_count !== null && item.max_meat_count !== undefined) 
                                        ? item.max_meat_count 
                                        : null)
                                });
                                setShowMenuModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                            >
                              <FaEdit className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteMenu(item.id)}
                              className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                            >
                              <FaTrash className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        
                        <p className="text-xs text-gray-600 dark:text-gray-300 mb-1 line-clamp-2">{item.description}</p>
                        
                        {/* Prix et catégorie */}
                        <div className="flex justify-between items-center mb-1">
                          <p className="font-semibold text-sm text-green-600">{item.prix} €</p>
                          <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded-full">
                            {item.category}
                          </span>
                        </div>
                        
                        {/* Suppléments */}
                        {item.supplements && item.supplements.length > 0 && (
                          <div className="mb-1">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Suppléments :</p>
                            <div className="flex flex-wrap gap-1">
                              {item.supplements.map((supp, index) => (
                                <span key={index} className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-1 py-0.5 rounded">
                                  {supp.nom} (+{supp.prix}€)
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Taille de boisson */}
                        {item.boisson_taille && (
                          <div className="mb-1">
                            <span className="text-xs bg-purple-100 text-purple-800 px-1 py-0.5 rounded">
                              Taille: {item.boisson_taille}
                            </span>
                          </div>
                        )}
                        
                        {/* Statut de disponibilité */}
                        <span
                          className={`inline-block px-1 py-0.5 rounded-full text-xs ${
                            item.disponible ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {item.disponible ? 'Disponible' : 'Indisponible'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'combos' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Menus composés</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Créez des menus avec plusieurs étapes (plat + accompagnement + boisson, etc.) en reliant vos articles existants.
                </p>
              </div>
              <button
                onClick={() => handleOpenComboModal()}
                className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg px-4 py-2 transition-colors"
              >
                + Nouveau menu composé
              </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="p-6">
                {combosLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-200 border-t-blue-600"></div>
                  </div>
                ) : !comboList.length ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    Aucun menu composé pour le moment. Cliquez sur "Nouveau menu composé" pour commencer.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {comboList.map((combo) => (
                      <div
                        key={combo.id}
                        className="border border-gray-200 dark:border-gray-700 rounded-2xl p-4 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {combo.nom}
                              </h3>
                              <span
                                className={`px-2 py-0.5 text-xs rounded-full ${
                                  combo.actif !== false
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-red-100 text-red-700'
                                }`}
                              >
                                {combo.actif !== false ? 'Actif' : 'Inactif'}
                              </span>
                            </div>
                            {combo.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                {combo.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 self-end sm:self-start">
                            <button
                              onClick={() => handleOpenComboModal(combo)}
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/60 px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                            >
                              Modifier
                            </button>
                            <button
                              onClick={() => handleDeleteCombo(combo.id)}
                              className="inline-flex items-center gap-1 text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/60 px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                            >
                              Supprimer
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
                          <div>Prix de base : <span className="font-semibold text-gray-900 dark:text-white">{(combo.prix_base || 0).toFixed(2)} €</span></div>
                          <div>Ordre : <span className="font-medium">{combo.ordre_affichage ?? 0}</span></div>
                        </div>

                        <div className="space-y-4">
                          {combo.steps?.map((step, stepIndex) => (
                            <div key={step.id || stepIndex} className="rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                <div>
                                  <h4 className="font-semibold text-gray-900 dark:text-white">
                                    Étape {stepIndex + 1} — {step.title}
                                  </h4>
                                  {step.description && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                      {step.description}
                                    </p>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {step.min_selections === 0 && (step.max_selections === 0 || step.max_selections === null)
                                    ? 'Étape facultative (aucun choix requis)'
                                    : `${step.min_selections} sélection(s) min · ${
                                        step.max_selections === null ? 'illimité' : step.max_selections
                                      } max`}
                                </div>
                              </div>

                              <div className="mt-3 space-y-2">
                                {step.options?.map((option, optionIndex) => (
                                  <div
                                    key={option.id || `${step.id}-${optionIndex}`}
                                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-900/80"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                          {option.nom || (option.type === 'custom' ? `Option ${optionIndex + 1}` : 'Article lié')}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                          {option.type === 'custom' ? 'Option personnalisée' : 'Article du menu'}
                                          {option.linked_menu_id && option.type !== 'custom' && (
                                            <> · <span className="italic">
                                              {menu.find((item) => item.id === option.linked_menu_id)?.nom || 'Article indisponible'}
                                            </span></>
                                          )}
                                        </p>
                                        {option.description && (
                                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            {option.description}
                                          </p>
                                        )}
                                      </div>
                                      <div className="text-right">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                          {option.prix_supplementaire ? `+${option.prix_supplementaire.toFixed(2)} €` : 'Inclus'}
                                        </p>
                                        <span className={`inline-flex text-[11px] mt-1 px-2 py-0.5 rounded-full ${
                                          option.disponible !== false
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-red-100 text-red-700'
                                        }`}>
                                          {option.disponible !== false ? 'Disponible' : 'Indispo'}
                                        </span>
                                      </div>
                                    </div>

                                    {option.variants?.length > 0 && (
                                      <div className="mt-3 border-t border-dashed border-gray-200 dark:border-gray-700 pt-2">
                                        <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                                          Variantes
                                        </p>
                                        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
                                          {option.variants.map((variant, variantIndex) => (
                                            <li key={variant.id || `${option.id}-${variantIndex}`} className="flex items-center justify-between">
                                              <span>
                                                {variant.nom}
                                                {variant.description && (
                                                  <span className="text-gray-400"> — {variant.description}</span>
                                                )}
                                                {variant.is_default && (
                                                  <span className="ml-2 text-[10px] uppercase tracking-wide text-blue-500">
                                                    Par défaut
                                                  </span>
                                                )}
                                              </span>
                                              <span className="font-medium text-gray-900 dark:text-white">
                                                {variant.prix_supplementaire ? `+${variant.prix_supplementaire.toFixed(2)} €` : 'Inclus'}
                                              </span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Menu Modal */}
      {showMenuModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingMenu ? 'Modifier le plat' : 'Ajouter un plat'}
            </h3>
            <form onSubmit={handleMenuSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nom du plat
                  </label>
                  <input
                    type="text"
                    value={menuForm.nom}
                    onChange={(e) => setMenuForm({...menuForm, nom: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Prix (€)
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    Astuce : ajoutez +25% sur vos prix pour compenser la commission et préserver votre marge.
                  </p>
                  <input
                    type="number"
                    step="0.01"
                    value={menuForm.prix}
                    onChange={(e) => setMenuForm({...menuForm, prix: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={menuForm.description}
                  onChange={(e) => setMenuForm({...menuForm, description: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Categorie
                  </label>
                  <select
                    value={menuForm.category}
                    onChange={(e) => setMenuForm({...menuForm, category: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sélectionner une section</option>
                    {menuForm.category &&
                      !(Array.isArray(menuSections) && menuSections.some((s) => s?.name === menuForm.category)) &&
                      !CATEGORY_OPTIONS.some((o) => o.value === menuForm.category) && (
                        <option value={menuForm.category}>{menuForm.category}</option>
                      )}
                    {Array.isArray(menuSections) && menuSections.length > 0
                      ? menuSections.map((section) => (
                          <option key={section.id} value={section.name}>
                            {section.name}
                          </option>
                        ))
                      : CATEGORY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                  </select>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="disponible"
                    checked={menuForm.disponible}
                    onChange={(e) => setMenuForm({...menuForm, disponible: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="disponible" className="ml-2 block text-sm text-gray-900">
                    Disponible
                  </label>
                </div>
              </div>

              {/* Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Image du plat
                </label>
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      
                      setUploadingImage(true);
                      try {
                        const formData = new FormData();
                        formData.append('file', file);
                        formData.append('folder', 'menu-images');
                        if (userData?.id) formData.append('userId', userData.id);

                        const response = await fetch('/api/upload-image', {
                          method: 'POST',
                          body: formData
                        });

                        const data = await response.json();
                        if (response.ok && data.imageUrl) {
                          setMenuForm({...menuForm, image_url: data.imageUrl});
                        } else {
                          alert(data.error || 'Erreur lors de l\'upload de l\'image');
                        }
                      } catch (error) {
                        console.error('Erreur upload:', error);
                        alert('Erreur lors de l\'upload de l\'image');
                      } finally {
                        setUploadingImage(false);
                      }
                    }}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    disabled={uploadingImage}
                  />
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Ou utilisez une URL :
                  </div>
                  <input
                    type="url"
                    value={menuForm.image_url || ''}
                    onChange={(e) => setMenuForm({...menuForm, image_url: e.target.value})}
                    placeholder="https://exemple.com/image.jpg"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  {uploadingImage && (
                    <div className="text-sm text-blue-600 dark:text-blue-400">Upload en cours...</div>
                  )}
                  {menuForm.image_url && (
                    <div className="mt-2">
                      <img src={menuForm.image_url} alt="Aperçu" className="w-20 h-20 object-cover rounded-lg" />
                    </div>
                  )}
                </div>
              </div>

              {/* Gestion des suppléments */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Suppléments disponibles
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowSupplementModal(true)}
                    className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition-colors text-sm"
                  >
                    + Ajouter
                  </button>
                </div>
                {Array.isArray(menuForm.supplements) && menuForm.supplements.length > 0 && (
                  <div className="space-y-2">
                    {menuForm.supplements.map((supp, index) => (
                      <div key={supp.id || index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <span className="text-sm text-gray-900 dark:text-white">{supp.nom} - {supp.prix}€</span>
                        <button
                          type="button"
                          onClick={() => removeSupplement(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Options de customisation - Viandes */}
              {menuForm.category !== 'boisson' && (
                <>
                  <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Options de viande (pour tacos, etc.)
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const newMeat = { id: `meat-${Date.now()}`, nom: '', prix: 0, default: false, disponible: true };
                          setMenuForm({...menuForm, meat_options: [...menuForm.meat_options, newMeat]});
                        }}
                        className="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition-colors text-sm"
                      >
                        + Ajouter viande
                      </button>
                    </div>
                    {Array.isArray(menuForm.meat_options) && menuForm.meat_options.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {menuForm.meat_options.map((meat, index) => (
                          <div key={meat.id || index} className="grid grid-cols-1 md:grid-cols-5 gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <input
                              type="text"
                              value={meat.nom || ''}
                              onChange={(e) => {
                                const updated = [...menuForm.meat_options];
                                updated[index] = {...updated[index], nom: e.target.value};
                                setMenuForm({...menuForm, meat_options: updated});
                              }}
                              placeholder="Nom (ex: Poulet)"
                              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                            />
                            <div className="flex flex-col">
                              <label className="text-xs text-gray-500 mb-1">Prix (€)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={meat.prix || 0}
                                onChange={(e) => {
                                  const updated = [...menuForm.meat_options];
                                  updated[index] = {...updated[index], prix: parseFloat(e.target.value) || 0};
                                  setMenuForm({...menuForm, meat_options: updated});
                                }}
                                placeholder="0.00"
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                              />
                            </div>
                            <label className="flex items-center text-sm">
                              <input
                                type="checkbox"
                                checked={meat.disponible !== false}
                                onChange={(e) => {
                                  const updated = [...menuForm.meat_options];
                                  updated[index] = {...updated[index], disponible: e.target.checked};
                                  setMenuForm({...menuForm, meat_options: updated});
                                }}
                                className="mr-2"
                                title="Décocher si cette viande n'est plus disponible (ex: rupture de stock)"
                              />
                              <span className={meat.disponible !== false ? '' : 'text-red-600 line-through'}>
                                Disponible
                              </span>
                            </label>
                            <label className="flex items-center text-sm">
                              <input
                                type="checkbox"
                                checked={meat.default || false}
                                onChange={(e) => {
                                  const updated = [...menuForm.meat_options];
                                  updated[index] = {...updated[index], default: e.target.checked};
                                  setMenuForm({...menuForm, meat_options: updated});
                                }}
                                className="mr-2"
                              />
                              Par défaut
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setMenuForm({...menuForm, meat_options: menuForm.meat_options.filter((_, i) => i !== index)});
                              }}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Supprimer
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center mb-3">
                      <input
                        type="checkbox"
                        id="requires_meat_selection"
                        checked={menuForm.requires_meat_selection}
                        onChange={(e) => setMenuForm({...menuForm, requires_meat_selection: e.target.checked})}
                        className="mr-2"
                      />
                      <label htmlFor="requires_meat_selection" className="text-sm text-gray-700 dark:text-gray-300">
                        Sélection de viande obligatoire
                      </label>
                    </div>
                    <div className="mb-3">
                      <label htmlFor="max_meats" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Limite de viandes (laisser vide pour illimité)
                      </label>
                      <input
                        type="number"
                        id="max_meats"
                        min="1"
                        value={menuForm.max_meats || ''}
                        onChange={(e) => setMenuForm({...menuForm, max_meats: e.target.value ? parseInt(e.target.value) : null})}
                        placeholder="Ex: 2 (maximum 2 viandes)"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Définir une limite (ex: 2) pour restreindre le nombre de viandes sélectionnables par le client
                      </p>
                    </div>
                  </div>

                  {/* Options de customisation - Sauces */}
                  <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Options de sauce
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const newSauce = { id: `sauce-${Date.now()}`, nom: '', prix: 0, default: false };
                          setMenuForm({...menuForm, sauce_options: [...menuForm.sauce_options, newSauce]});
                        }}
                        className="bg-yellow-600 text-white px-3 py-1 rounded-lg hover:bg-yellow-700 transition-colors text-sm"
                      >
                        + Ajouter sauce
                      </button>
                    </div>
                    {Array.isArray(menuForm.sauce_options) && menuForm.sauce_options.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {menuForm.sauce_options.map((sauce, index) => (
                          <div key={sauce.id || index} className="grid grid-cols-1 md:grid-cols-4 gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <input
                              type="text"
                              value={sauce.nom || ''}
                              onChange={(e) => {
                                const updated = [...menuForm.sauce_options];
                                updated[index] = {...updated[index], nom: e.target.value};
                                setMenuForm({...menuForm, sauce_options: updated});
                              }}
                              placeholder="Nom (ex: Sauce blanche)"
                              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                            />
                            <div className="flex flex-col">
                              <label className="text-xs text-gray-500 mb-1">Prix (€)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={sauce.prix || 0}
                                onChange={(e) => {
                                  const updated = [...menuForm.sauce_options];
                                  updated[index] = {...updated[index], prix: parseFloat(e.target.value) || 0};
                                  setMenuForm({...menuForm, sauce_options: updated});
                                }}
                                placeholder="0.00"
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                              />
                            </div>
                            <label className="flex items-center text-sm">
                              <input
                                type="checkbox"
                                checked={sauce.default || false}
                                onChange={(e) => {
                                  const updated = [...menuForm.sauce_options];
                                  updated[index] = {...updated[index], default: e.target.checked};
                                  setMenuForm({...menuForm, sauce_options: updated});
                                }}
                                className="mr-2"
                              />
                              Par défaut
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setMenuForm({...menuForm, sauce_options: menuForm.sauce_options.filter((_, i) => i !== index)});
                              }}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Supprimer
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center mb-3">
                      <input
                        type="checkbox"
                        id="requires_sauce_selection"
                        checked={menuForm.requires_sauce_selection}
                        onChange={(e) => setMenuForm({...menuForm, requires_sauce_selection: e.target.checked})}
                        className="mr-2"
                      />
                      <label htmlFor="requires_sauce_selection" className="text-sm text-gray-700 dark:text-gray-300">
                        Sélection de sauce obligatoire
                      </label>
                    </div>
                    <div className="mb-3">
                      <label htmlFor="max_sauces" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Limite de sauces (laisser vide pour illimité, 0 si déjà comprises)
                      </label>
                      <input
                        type="number"
                        id="max_sauces"
                        min="0"
                        value={menuForm.max_sauces !== null && menuForm.max_sauces !== undefined ? menuForm.max_sauces : ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          setMenuForm({...menuForm, max_sauces: value === '' ? null : parseInt(value)});
                        }}
                        placeholder="Ex: 2 (maximum 2 sauces) ou 0 (déjà comprises)"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Définir une limite (ex: 2) pour restreindre le nombre de sauces, ou 0 si les sauces sont déjà comprises dans le plat
                      </p>
                    </div>
                  </div>

                  {/* Ingrédients de base (retirables) */}
                  <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Ingrédients de base (que le client peut retirer)
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const newIng = { id: `ing-${Date.now()}`, nom: '', prix: 0, removable: true };
                          setMenuForm({...menuForm, base_ingredients: [...menuForm.base_ingredients, newIng]});
                        }}
                        className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition-colors text-sm"
                      >
                        + Ajouter ingrédient
                      </button>
                    </div>
                    {Array.isArray(menuForm.base_ingredients) && menuForm.base_ingredients.length > 0 && (
                      <div className="space-y-2">
                        {menuForm.base_ingredients.map((ing, index) => (
                          <div key={ing.id || index} className="grid grid-cols-1 md:grid-cols-3 gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <input
                              type="text"
                              value={ing.nom || ''}
                              onChange={(e) => {
                                const updated = [...menuForm.base_ingredients];
                                updated[index] = {...updated[index], nom: e.target.value};
                                setMenuForm({...menuForm, base_ingredients: updated});
                              }}
                              placeholder="Nom (ex: Tomate, Oignon)"
                              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                            />
                            <input
                              type="number"
                              step="0.01"
                              value={ing.prix || 0}
                              onChange={(e) => {
                                const updated = [...menuForm.base_ingredients];
                                updated[index] = {...updated[index], prix: parseFloat(e.target.value) || 0};
                                setMenuForm({...menuForm, base_ingredients: updated});
                              }}
                              placeholder="Prix (€)"
                              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setMenuForm({...menuForm, base_ingredients: menuForm.base_ingredients.filter((_, i) => i !== index)});
                              }}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Supprimer
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Gestion des tailles de boissons */}
              {menuForm.category === 'boisson' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Taille
                    </label>
                    <input
                      type="text"
                      value={menuForm.boisson_taille}
                      onChange={(e) => setMenuForm({...menuForm, boisson_taille: e.target.value})}
                      placeholder="ex: 33cl, 50cl, 1L"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Prix pour cette taille (€)
                    </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    Pensez à appliquer +25% pour conserver votre marge sur CVN'EAT.
                  </p>
                    <input
                      type="number"
                      step="0.01"
                      value={menuForm.prix_taille}
                      onChange={(e) => setMenuForm({...menuForm, prix_taille: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingMenu ? 'Modifier' : 'Ajouter'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMenuModal(false);
                    setMenuForm(createDefaultMenuForm());
                    setEditingMenu(null);
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSupplementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Ajouter un supplément</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nom du supplément</label>
                <input
                  type="text"
                  value={supplementForm.nom}
                  onChange={(e) => setSupplementForm({ ...supplementForm, nom: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Prix (€)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={supplementForm.prix}
                  onChange={(e) => setSupplementForm({ ...supplementForm, prix: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={addSupplement}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Ajouter
                </button>
                <button
                  type="button"
                  onClick={() => setShowSupplementModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showComboModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleCloseComboModal}
          ></div>
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto w-full max-w-5xl border border-gray-100 dark:border-gray-700">
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-700">
              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                  {editingCombo ? 'Modifier le menu composé' : 'Créer un menu composé'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Définissez les étapes (ex: Burger · Accompagnement · Boisson) et rattachez vos articles existants.
                </p>
              </div>
              <button
                onClick={handleCloseComboModal}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                type="button"
              >
                <FaTimes className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleComboSubmit} className="px-6 py-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nom du menu composé *
                  </label>
                  <input
                    type="text"
                    value={comboForm.nom}
                    onChange={(e) => updateComboField('nom', e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="Ex: Menu Burger complet"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Prix de base (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={comboForm.prix_base}
                      onChange={(e) => updateComboField('prix_base', e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      placeholder="0.00"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Ce prix sera additionné aux suppléments choisis par le client.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Ordre d'affichage
                    </label>
                    <input
                      type="number"
                      value={comboForm.ordre_affichage}
                      onChange={(e) => updateComboField('ordre_affichage', e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description (optionnelle)
                </label>
                <textarea
                  value={comboForm.description}
                  onChange={(e) => updateComboField('description', e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="Ajoutez des précisions sur ce menu pour vos clients."
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={comboForm.actif}
                    onChange={(e) => updateComboField('actif', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  Menu actif (visible des clients)
                </label>
              </div>

              <div className="space-y-4">
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
                    <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                      Étapes du menu ({comboForm.steps.length})
                    </h4>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleAddSauceStep}
                        className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm"
                        title="Ajouter une étape sauces avec les sauces proposées par votre restaurant"
                      >
                        🍯 Ajouter étape sauces
                      </button>
                      <button
                        type="button"
                        onClick={handleAddComboStep}
                        className="inline-flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors dark:bg-blue-900/40 dark:hover:bg-blue-900/60"
                      >
                        + Ajouter une étape
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                    💡 Astuce : Utilisez "Ajouter étape sauces" pour créer rapidement une étape avec toutes les sauces de votre menu
                  </p>
                </div>

                {comboForm.steps.map((step, stepIndex) => {
                  const searchValue = comboStepSearch[stepIndex] || '';
                  const normalizedSearch = searchValue.trim().toLowerCase();
                  const searchResults = normalizedSearch
                    ? (menu || [])
                        .filter((item) => {
                          const name = (item.nom || '').toLowerCase();
                          const category = (item.category || '').toLowerCase();
                          return name.includes(normalizedSearch) || category.includes(normalizedSearch);
                        })
                        .slice(0, 10)
                    : [];
                  const optionalStep = isStepOptional(step);

                  return (
                    <div
                      key={stepIndex}
                      className="border border-gray-200 dark:border-gray-700 rounded-2xl p-4 bg-gray-50 dark:bg-gray-800 space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Titre de l'étape *
                          </label>
                          <input
                            type="text"
                            value={step.title}
                            onChange={(e) => handleStepFieldChange(stepIndex, 'title', e.target.value)}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                            placeholder={`Ex: Étape ${stepIndex + 1} — Choix du burger`}
                            required
                          />
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-20">
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                              Minimum
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={step.min_selections}
                              onChange={(e) => handleStepFieldChange(stepIndex, 'min_selections', e.target.value)}
                              disabled={optionalStep}
                              className={`w-full border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm ${optionalStep ? 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'border-gray-300 dark:border-gray-600'}`}
                            />
                          </div>
                          <div className="w-20">
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                              Maximum
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={step.max_selections}
                              onChange={(e) => handleStepFieldChange(stepIndex, 'max_selections', e.target.value)}
                              disabled={optionalStep}
                              className={`w-full border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm ${optionalStep ? 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'border-gray-300 dark:border-gray-600'}`}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleStepOptional(stepIndex)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${optionalStep ? 'border-orange-400 text-orange-600 bg-orange-50 dark:border-orange-500 dark:text-orange-300 dark:bg-orange-500/10' : 'border-gray-300 text-gray-600 hover:border-orange-400 hover:text-orange-600 dark:border-gray-600 dark:text-gray-300 dark:hover:border-orange-400'}`}
                          >
                            {optionalStep ? 'Rendre obligatoire' : 'Rendre facultative'}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Description (optionnelle)
                        </label>
                        <textarea
                          value={step.description}
                          onChange={(e) => handleStepFieldChange(stepIndex, 'description', e.target.value)}
                          rows={2}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                          placeholder="Indiquez des instructions pour le client"
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h5 className="text-sm font-semibold text-gray-900 dark:text-white">
                            Options ({step.options.length})
                          </h5>
                          <button
                            type="button"
                            onClick={() => handleAddComboOption(stepIndex)}
                            className="inline-flex items-center gap-1.5 bg-green-50 hover:bg-green-100 text-green-600 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors dark:bg-green-900/30 dark:hover:bg-green-900/60"
                          >
                            + Ajouter une option
                          </button>
                        </div>

                        {(menu || []).length > 0 && (
                          <div className="space-y-3 bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-3">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <div className="flex-1">
                                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                                  Ajouter un plat existant
                                </label>
                                <input
                                  type="text"
                                  placeholder="Rechercher dans vos plats (ex: burger, boisson...)"
                                  value={searchValue}
                                  onChange={(e) =>
                                    setComboStepSearch((prev) => ({
                                      ...prev,
                                      [stepIndex]: e.target.value
                                    }))
                                  }
                                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                                />
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 sm:text-right">
                                Cliquez sur un plat pour l'ajouter automatiquement comme option.
                              </p>
                            </div>

                            {normalizedSearch && (
                              <div className="flex flex-wrap gap-2">
                                {searchResults.length > 0 ? (
                                  searchResults.map((item) => {
                                    const alreadyAdded = step.options.some(
                                      (opt) => opt.type !== 'custom' && opt.linked_menu_id === item.id
                                    );
                                    return (
                                      <button
                                        key={`search-${item.id}`}
                                        type="button"
                                        onClick={() => handleAddExistingMenuAsOption(stepIndex, item)}
                                        disabled={alreadyAdded}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                                          alreadyAdded
                                            ? 'border-green-300 text-green-600 bg-green-50 dark:border-green-700 dark:text-green-300 dark:bg-green-900/40 cursor-not-allowed'
                                            : 'border-gray-300 text-gray-700 hover:border-blue-500 hover:text-blue-600 dark:border-gray-600 dark:text-gray-200 dark:hover:border-blue-500'
                                        } transition-colors`}
                                      >
                                        {item.nom}
                                        {alreadyAdded && <FaCheck className="inline ml-1 h-3 w-3" />}
                                      </button>
                                    );
                                  })
                                ) : (
                                  <span className="text-xs text-gray-400">Aucun plat correspondant</span>
                                )}
                              </div>
                            )}

                            <div className="space-y-2">
                              {Object.entries(groupedMenuByCategory || {}).map(([categoryName, items]) => {
                                const filteredItems = items.filter((item) => {
                                  if (!normalizedSearch) return true;
                                  const name = (item.nom || '').toLowerCase();
                                  const category = (item.category || '').toLowerCase();
                                  return name.includes(normalizedSearch) || category.includes(normalizedSearch);
                                });

                                if (!filteredItems.length) return null;

                                const limitedItems = filteredItems.slice(0, 6);
                                const allAdded = filteredItems.every((item) =>
                                  step.options.some((opt) => opt.type !== 'custom' && opt.linked_menu_id === item.id)
                                );

                                return (
                                  <div
                                    key={`${stepIndex}-${categoryName}`}
                                    className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                                        {categoryName} ({filteredItems.length})
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleAddCategoryItems(stepIndex, filteredItems)}
                                        disabled={allAdded}
                                        className={`text-xs ${
                                          allAdded
                                            ? 'text-gray-400 cursor-not-allowed'
                                            : 'text-blue-600 hover:text-blue-700'
                                        } transition-colors`}
                                      >
                                        Ajouter tout
                                      </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                      {limitedItems.map((item) => {
                                        const alreadyAdded = step.options.some(
                                          (opt) => opt.type !== 'custom' && opt.linked_menu_id === item.id
                                        );
                                        return (
                                          <button
                                            key={`${categoryName}-${item.id}`}
                                            type="button"
                                            onClick={() => handleAddExistingMenuAsOption(stepIndex, item)}
                                            disabled={alreadyAdded}
                                            className={`px-3 py-1 rounded-full text-xs border ${
                                              alreadyAdded
                                                ? 'border-green-300 text-green-600 bg-green-50 dark:border-green-700 dark:text-green-300 dark:bg-green-900/40 cursor-not-allowed'
                                                : 'border-gray-300 text-gray-700 hover:border-blue-500 hover:text-blue-600 dark:border-gray-600 dark:text-gray-200 dark:hover:border-blue-500'
                                            } transition-colors`}
                                          >
                                            {item.nom}
                                            {alreadyAdded && <FaCheck className="inline ml-1 h-3 w-3" />}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {step.options.map((option, optionIndex) => (
                          <div
                            key={optionIndex}
                            className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-900 space-y-4"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                    Type d'option
                                  </label>
                                  <select
                                    value={option.type}
                                    onChange={(e) => handleComboOptionChange(stepIndex, optionIndex, 'type', e.target.value)}
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                                  >
                                    <option value="link_to_item">Article existant</option>
                                    <option value="custom">Option personnalisée</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                    Supplément (€)
                                  </label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={option.prix_supplementaire}
                                    onChange={(e) => handleComboOptionChange(stepIndex, optionIndex, 'prix_supplementaire', e.target.value)}
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                                    placeholder="0.00"
                                  />
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveComboOption(stepIndex, optionIndex)}
                                className="self-start text-red-600 hover:text-red-700 text-sm font-medium"
                              >
                                Supprimer
                              </button>
                            </div>

                            {option.type !== 'custom' && (
                              <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                  Lier à un article existant *
                                </label>
                                <select
                                  value={option.linked_menu_id || ''}
                                  onChange={(e) => handleComboOptionChange(stepIndex, optionIndex, 'linked_menu_id', e.target.value)}
                                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                                  required
                                >
                                  <option value="">— Sélectionnez un article —</option>
                                  {menu.map((item) => (
                                    <option key={item.id} value={item.id}>
                                      {item.nom}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                  Nom affiché au client *
                                </label>
                                <input
                                  type="text"
                                  value={option.nom}
                                  onChange={(e) => handleComboOptionChange(stepIndex, optionIndex, 'nom', e.target.value)}
                                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                                  placeholder="Ex: Burger au poulet"
                                  required
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={option.disponible !== false}
                                  onChange={(e) => handleComboOptionChange(stepIndex, optionIndex, 'disponible', e.target.checked)}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">Option disponible</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                  Description optionnelle
                                </label>
                                <textarea
                                  value={option.description}
                                  onChange={(e) => handleComboOptionChange(stepIndex, optionIndex, 'description', e.target.value)}
                                  rows={2}
                                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                                  placeholder="Détaillez cette option"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                  Image (URL)
                                </label>
                                <input
                                  type="url"
                                  value={option.image_url || ''}
                                  onChange={(e) => handleComboOptionChange(stepIndex, optionIndex, 'image_url', e.target.value)}
                                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                                  placeholder="https://..."
                                />
                              </div>
                            </div>

                            {/* Bouton pour ajouter les sauces comme variantes (utile pour frites, etc.) */}
                            {(option.nom?.toLowerCase().includes('frite') || option.nom?.toLowerCase().includes('accompagnement')) && (
                              <div className="border border-orange-200 dark:border-orange-800 rounded-lg p-3 bg-orange-50 dark:bg-orange-900/20 mb-3">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-xs font-semibold text-orange-800 dark:text-orange-200">
                                      🍯 Sauces pour {option.nom}
                                    </p>
                                    <p className="text-xs text-orange-600 dark:text-orange-300 mt-1">
                                      Ajoutez automatiquement les sauces de votre menu comme variantes
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleAddSaucesAsVariants(stepIndex, optionIndex)}
                                    className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-lg transition-colors"
                                  >
                                    Ajouter sauces
                                  </button>
                                </div>
                              </div>
                            )}

                            <div className="rounded-lg bg-gray-50 dark:bg-gray-800/80 border border-dashed border-gray-200 dark:border-gray-700 p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                  Variantes (optionnel)
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleAddComboVariant(stepIndex, optionIndex)}
                                  className="text-sm text-purple-600 hover:text-purple-700"
                                >
                                  + Ajouter une variante
                                </button>
                              </div>
                              {(option.variants || []).length > 0 && (
                                <div className="space-y-2">
                                  {option.variants.map((variant, variantIndex) => (
                                    <div
                                      key={variantIndex}
                                      className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-start bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3"
                                    >
                                      <div className="sm:col-span-2">
                                        <input
                                          type="text"
                                          value={variant.nom}
                                          onChange={(e) => handleComboVariantChange(stepIndex, optionIndex, variantIndex, 'nom', e.target.value)}
                                          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                                          placeholder="Nom de la variante"
                                        />
                                      </div>
                                      <div className="sm:col-span-2">
                                        <input
                                          type="text"
                                          value={variant.description}
                                          onChange={(e) => handleComboVariantChange(stepIndex, optionIndex, variantIndex, 'description', e.target.value)}
                                          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                                          placeholder="Description"
                                        />
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="number"
                                          step="0.01"
                                          value={variant.prix_supplementaire}
                                          onChange={(e) => handleComboVariantChange(stepIndex, optionIndex, variantIndex, 'prix_supplementaire', e.target.value)}
                                          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                                          placeholder="€"
                                        />
                                      </div>
                                      <div className="sm:col-span-2 flex items-center gap-3">
                                        <label className="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
                                          <input
                                            type="checkbox"
                                            checked={variant.is_default === true}
                                            onChange={(e) => handleComboVariantChange(stepIndex, optionIndex, variantIndex, 'is_default', e.target.checked)}
                                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                                          />
                                          Par défaut
                                        </label>
                                        <label className="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
                                          <input
                                            type="checkbox"
                                            checked={variant.disponible !== false}
                                            onChange={(e) => handleComboVariantChange(stepIndex, optionIndex, variantIndex, 'disponible', e.target.checked)}
                                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                                          />
                                          Disponible
                                        </label>
                                      </div>
                                      <div className="text-right">
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveComboVariant(stepIndex, optionIndex, variantIndex)}
                                          className="text-xs text-red-600 hover:text-red-700"
                                        >
                                          Supprimer
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={handleCloseComboModal}
                  className="w-full sm:w-auto px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={savingCombo}
                  className="w-full sm:w-auto px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors disabled:opacity-60"
                >
                  {savingCombo ? 'Enregistrement...' : editingCombo ? 'Mettre à jour' : 'Créer le menu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showFormulaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              {editingFormula ? 'Modifier la formule' : 'Créer une formule'}
            </h3>
            <form onSubmit={handleFormulaSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nom de la formule *
                  </label>
                  <input
                    type="text"
                    value={formulaForm.nom}
                    onChange={(e) => setFormulaForm({...formulaForm, nom: e.target.value})}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Ex: Menu complet, Formule déjeuner..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Prix de la formule (€) *
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    Conseillé : ajoutez +25% pour aligner la marge brute avec vos ventes directes.
                  </p>
                  <input
                    type="number"
                    step="0.01"
                    value={formulaForm.prix}
                    onChange={(e) => setFormulaForm({...formulaForm, prix: e.target.value})}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formulaForm.description}
                  onChange={(e) => setFormulaForm({...formulaForm, description: e.target.value})}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows="3"
                  placeholder="Description de la formule..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Prix réduit (€) - Optionnel
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formulaForm.prix_reduit}
                    onChange={(e) => setFormulaForm({...formulaForm, prix_reduit: e.target.value})}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Prix si acheté séparément"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Prix total si les plats étaient achetés séparément (pour afficher l'économie)
                  </p>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="formula_disponible"
                    checked={formulaForm.disponible}
                    onChange={(e) => setFormulaForm({...formulaForm, disponible: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="formula_disponible" className="ml-2 block text-sm text-gray-900 dark:text-white">
                    Disponible
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Image de la formule
                </label>
                <input
                  type="url"
                  value={formulaForm.image_url || ''}
                  onChange={(e) => setFormulaForm({...formulaForm, image_url: e.target.value})}
                  placeholder="https://exemple.com/image.jpg"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Sélection des plats */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Plats de la formule *
                </label>
                {!Array.isArray(menu) || menu.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    Aucun plat disponible. Veuillez d'abord créer des plats dans l'onglet Menu.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-3">
                    {menu.map((item) => {
                      const isSelected = formulaForm.menu_items.some(mi => mi.menu_id === item.id);
                      const selectedItem = formulaForm.menu_items.find(mi => mi.menu_id === item.id);
                      
                      return (
                        <div
                          key={item.id}
                          className={`p-3 rounded-lg border transition-all ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-900 border-blue-300 dark:border-blue-700'
                              : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      // Ajouter le plat
                                      setFormulaForm({
                                        ...formulaForm,
                                        menu_items: [
                                          ...formulaForm.menu_items,
                                          {
                                            menu_id: item.id,
                                            order_index: formulaForm.menu_items.length,
                                            quantity: 1
                                          }
                                        ]
                                      });
                                    } else {
                                      // Retirer le plat
                                      setFormulaForm({
                                        ...formulaForm,
                                        menu_items: formulaForm.menu_items.filter(mi => mi.menu_id !== item.id)
                                      });
                                    }
                                  }}
                                  className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900 dark:text-white">{item.nom}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">{item.category} - {item.prix}€</p>
                                </div>
                              </div>
                              {isSelected && (
                                <div className="mt-2 ml-7 flex items-center space-x-2">
                                  <label className="text-xs text-gray-600 dark:text-gray-300">Quantité:</label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={selectedItem?.quantity || 1}
                                    onChange={(e) => {
                                      const quantity = parseInt(e.target.value) || 1;
                                      setFormulaForm({
                                        ...formulaForm,
                                        menu_items: formulaForm.menu_items.map(mi =>
                                          mi.menu_id === item.id
                                            ? { ...mi, quantity: quantity }
                                            : mi
                                        )
                                      });
                                    }}
                                    className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const currentIndex = selectedItem?.order_index ?? formulaForm.menu_items.length - 1;
                                      const newIndex = Math.max(0, currentIndex - 1);
                                      setFormulaForm({
                                        ...formulaForm,
                                        menu_items: formulaForm.menu_items.map(mi =>
                                          mi.menu_id === item.id
                                            ? { ...mi, order_index: newIndex }
                                            : mi.order_index === newIndex
                                            ? { ...mi, order_index: currentIndex }
                                            : mi
                                        )
                                      });
                                    }}
                                    className="text-xs text-blue-600 hover:text-blue-800"
                                    disabled={selectedItem?.order_index === 0}
                                  >
                                    ↑
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const currentIndex = selectedItem?.order_index ?? formulaForm.menu_items.length - 1;
                                      const maxIndex = formulaForm.menu_items.length - 1;
                                      const newIndex = Math.min(maxIndex, currentIndex + 1);
                                      setFormulaForm({
                                        ...formulaForm,
                                        menu_items: formulaForm.menu_items.map(mi =>
                                          mi.menu_id === item.id
                                            ? { ...mi, order_index: newIndex }
                                            : mi.order_index === newIndex
                                            ? { ...mi, order_index: currentIndex }
                                            : mi
                                        )
                                      });
                                    }}
                                    className="text-xs text-blue-600 hover:text-blue-800"
                                    disabled={selectedItem?.order_index === formulaForm.menu_items.length - 1}
                                  >
                                    ↓
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {formulaForm.menu_items.length > 0 && (
                  <div className="mt-3 p-3 bg-green-50 dark:bg-green-900 rounded-lg">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                      Ordre des plats dans la formule:
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-green-700 dark:text-green-300">
                      {formulaForm.menu_items
                        .sort((a, b) => a.order_index - b.order_index)
                        .map((item, idx) => {
                          const menuItem = menu.find(m => m.id === item.menu_id);
                          return (
                            <li key={item.menu_id || idx}>
                              {item.quantity || 1}x {menuItem?.nom || 'Plat inconnu'}
                            </li>
                          );
                        })}
                    </ol>
                  </div>
                )}
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingFormula ? 'Modifier' : 'Créer'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowFormulaModal(false);
                    setFormulaForm({
                      nom: '',
                      description: '',
                      prix: '',
                      prix_reduit: '',
                      image_url: '',
                      disponible: true,
                      menu_items: []
                    });
                    setEditingFormula(null);
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 

const isStepOptional = (step) => {
  if (!step) return false;
  const min = parseInt(step.min_selections, 10);
  const max = parseInt(step.max_selections, 10);
  const normalizedMin = Number.isNaN(min) ? 0 : min;
  const normalizedMax = Number.isNaN(max) ? 0 : max;
  return normalizedMin === 0 && normalizedMax === 0;
};

const toggleStepOptional = (stepIndex) => {
  updateComboStep(stepIndex, (step) => {
    if (!step) return step;
    const currentlyOptional = isStepOptional(step);
    if (currentlyOptional) {
      const fallbackMin = 1;
      let fallbackMax = parseInt(step.max_selections, 10);
      if (Number.isNaN(fallbackMax) || fallbackMax < fallbackMin) {
        fallbackMax = fallbackMin;
      }
      return {
        ...step,
        min_selections: fallbackMin.toString(),
        max_selections: fallbackMax.toString()
      };
    }

    return {
      ...step,
      min_selections: '0',
      max_selections: '0'
    };
  });
};