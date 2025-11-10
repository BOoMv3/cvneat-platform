'use client';
import { useState, useEffect, useRef } from 'react';
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
  FaArrowLeft
} from 'react-icons/fa';
import RealTimeNotifications from '../components/RealTimeNotifications';

const CATEGORY_OPTIONS = [
  { value: 'entree', label: 'Entrée' },
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
  const [formulas, setFormulas] = useState([]);
  const [loading, setLoading] = useState(true);
  // Initialiser activeTab depuis l'URL hash si présent
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'orders' || hash === 'menu' || hash === 'dashboard' || hash === 'formulas') {
        return hash;
      }
    }
    return 'dashboard';
  });
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [menuForm, setMenuForm] = useState({
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
  const [editingMenu, setEditingMenu] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [preparationTime, setPreparationTime] = useState(15);
  const [showPreparationModal, setShowPreparationModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [isManuallyClosed, setIsManuallyClosed] = useState(false);
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

  // Synchroniser activeTab avec l'URL hash
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'orders' || hash === 'menu' || hash === 'dashboard' || hash === 'formulas') {
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
      setIsManuallyClosed(resto?.ferme_manuellement || resto?.is_closed || false);
      
      if (resto?.id) {
        await fetchDashboardData(resto.id);
        await fetchMenu(resto.id);
        await fetchOrders(resto.id);
        await fetchFormulas();
      }
      
      setLoading(false);
    };

    fetchData();
  }, [router]);

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
          return {
            ...item,
            supplements: parsedSupplements
          };
        });
        setMenu(parsedMenu);
      }
    } catch (error) {
      console.error('Erreur recuperation menu:', error);
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
        setMenuForm({ 
          nom: '', 
          description: '', 
          prix: '', 
          category: '', 
          disponible: true,
          image_url: '',
          supplements: [],
          boisson_taille: '',
          prix_taille: ''
        });
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
      // Si on accepte la commande, prepTime doit être fourni
      if (status === 'acceptee' && !prepTime) {
        // Ouvrir le modal pour sélectionner le temps de préparation
        setSelectedOrderId(orderId);
        setPreparationTime(15);
        setShowPreparationModal(true);
        return;
      }

      // Si on refuse la commande, ouvrir le modal pour saisir la raison
      if (status === 'refusee' && !reason) {
        setSelectedOrderId(orderId);
        setRejectionReason('');
        setShowRejectionModal(true);
        return;
      }

      const updateData = {
        status: status
      };

      // Si un temps de préparation est fourni, l'inclure dans la requête
      if (prepTime !== null && prepTime > 0) {
        updateData.preparation_time = prepTime;
      }

      console.log('🔄 Mise à jour commande:', { orderId, status, reason });
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('❌ Aucune session trouvée');
        return;
      }
      
      const token = session.access_token;
      console.log('🔑 Token présent:', token ? 'Oui' : 'Non');
      
      // Préparer le body avec status, preparation_time et reason si fournis
      const requestBody = { status };
      if (prepTime !== null && prepTime > 0) {
        requestBody.preparation_time = prepTime;
      }
      if (reason && reason.trim()) {
        requestBody.reason = reason.trim();
      }

      // Utiliser l'API correcte pour mettre à jour le statut
      const response = await fetch(`/api/restaurants/orders/${orderId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📤 Réponse API:', response.status, response.statusText);
      
      if (response.ok) {
        const responseData = await response.json().catch(() => null);
        console.log('✅ Commande mise à jour avec succès');
        console.log('📋 Données retournées par l\'API:', JSON.stringify(responseData, null, 2));
        
        // Vérifier le statut retourné par l'API
        if (responseData && responseData.order) {
          console.log('🔍 Statut dans la réponse API:', {
            orderId: responseData.order.id,
            statut: responseData.order.statut,
            ready_for_delivery: responseData.order.ready_for_delivery,
            original_status_sent: status
          });
        }
        
        // Recharger les données de manière sécurisée avec un petit délai pour laisser la base se mettre à jour
        try {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Augmenter le délai à 1 seconde
          await fetchOrders(restaurant?.id);
          if (restaurant?.id) {
            await fetchDashboardData(restaurant.id);
          }
        } catch (refreshError) {
          console.error('⚠️ Erreur lors du rafraîchissement:', refreshError);
          // Ne pas bloquer l'utilisateur, juste loguer l'erreur
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
        console.error('❌ Erreur API:', errorData);
        alert(`Erreur: ${errorData.error || 'Impossible de mettre à jour la commande'}`);
      }
    } catch (error) {
      console.error('❌ Erreur mise à jour commande:', error);
      alert(`Erreur: ${error.message || 'Impossible de mettre à jour la commande'}`);
    }
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
          const amount = parseFloat(order.total || 0) || 0;
          return sum + amount;
        }
        return sum;
      }, 0);
      
      // Calculer le chiffre d'affaires d'aujourd'hui (seulement les livrées)
      const todayRevenue = todayOrders.reduce((sum, order) => {
        if (!order) return sum;
        // Compter uniquement les commandes livrées aujourd'hui
        if (order.statut === 'livree') {
          const amount = parseFloat(order.total || 0) || 0;
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
    const commission = amount * 0.20; // 20% pour CVN'EAT
    const restaurantRevenue = amount - commission;
    return { commission, restaurantRevenue };
  };

  const toggleRestaurantClosed = async () => {
    if (!restaurant?.id) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const newStatus = !isManuallyClosed;
      
      const response = await fetch(`/api/partner/restaurant/${restaurant.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ferme_manuellement: newStatus
        })
      });
      
      if (response.ok) {
        setIsManuallyClosed(newStatus);
        setRestaurant(prev => ({ ...prev, ferme_manuellement: newStatus }));
        alert(newStatus ? 'Restaurant marqué comme fermé' : 'Restaurant marqué comme ouvert');
      } else {
        const error = await response.json();
        alert(`Erreur: ${error.error || 'Impossible de mettre à jour le statut'}`);
      }
    } catch (error) {
      console.error('Erreur toggle fermeture:', error);
      alert('Erreur lors de la mise à jour du statut');
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
                  isManuallyClosed
                    ? 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800'
                    : 'bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800'
                }`}
              >
                {isManuallyClosed ? (
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
                    window.open(`/restaurants/${restaurant.id}`, '_blank');
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
                            {(parseFloat(order.total || 0) || 0).toFixed(2)} €
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
                            onClick={() => updateOrderStatus(order.id, 'accepted')}
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
                      // Récupérer total (colonne réelle dans la base) avec fallback, puis 0
                      // IMPORTANT : order.total contient UNIQUEMENT le montant des articles (sans frais de livraison)
                      // Les frais de livraison ne font PAS partie du chiffre d'affaires du restaurant
                      const totalAmount = parseFloat(order.total || 0) || 0;
                      const deliveryFee = parseFloat(order.frais_livraison || 0) || 0;
                      // Ne PAS ajouter les frais de livraison pour l'affichage côté restaurant
                      // Le total affiché est uniquement le montant des articles
                      
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
                                Client: {order.users?.nom || order.customer_name || 'N/A'} {order.users?.prenom || ''}
                              </p>
                              {/* Afficher les frais de livraison séparément (pour info, mais pas dans le total) */}
                              {deliveryFee > 0 && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  Frais de livraison: {deliveryFee.toFixed(2)} € (livreur)
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
                          {order.details_commande && Array.isArray(order.details_commande) && order.details_commande.length > 0 && (
                            <div className="mt-4 p-3 bg-white dark:bg-gray-700 rounded border dark:border-gray-600">
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Articles commandés :</p>
                              <div className="space-y-2">
                                {order.details_commande.map((detail, index) => {
                                  const menu = detail.menus || {};
                                  const nom = menu.nom || 'Article inconnu';
                                  const quantite = detail.quantite || 1;
                                  const prixUnitaire = detail.prix_unitaire || menu.prix || 0;
                                  const prixTotal = prixUnitaire * quantite;
                                  
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
                                        <div className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                          <span className="font-medium">Viandes:</span>
                                          <ul className="list-disc list-inside ml-1">
                                            {customizations.selectedMeats.map((meat, meatIdx) => (
                                              <li key={meatIdx}>
                                                {meat.nom || meat.name} {(meat.prix || meat.price) > 0 && `(+${(meat.prix || meat.price || 0).toFixed(2)}€)`}
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                      
                                      {/* Sauces sélectionnées */}
                                      {customizations.selectedSauces && Array.isArray(customizations.selectedSauces) && customizations.selectedSauces.length > 0 && (
                                        <div className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                          <span className="font-medium">Sauces:</span>
                                          <ul className="list-disc list-inside ml-1">
                                            {customizations.selectedSauces.map((sauce, sauceIdx) => (
                                              <li key={sauceIdx}>
                                                {sauce.nom || sauce.name} {(sauce.prix || sauce.price) > 0 && `(+${(sauce.prix || sauce.price || 0).toFixed(2)}€)`}
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                      
                                      {/* Ingrédients retirés */}
                                      {customizations.removedIngredients && Array.isArray(customizations.removedIngredients) && customizations.removedIngredients.length > 0 && (
                                        <div className="text-xs text-orange-600 dark:text-orange-400 ml-2">
                                          <span className="font-medium">Ingrédients retirés:</span>
                                          <ul className="list-disc list-inside ml-1">
                                            {customizations.removedIngredients.map((ing, ingIdx) => (
                                              <li key={ingIdx}>
                                                {ing.nom || ing.name}
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          {(!order.details_commande || !Array.isArray(order.details_commande) || order.details_commande.length === 0) && (
                            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900 rounded border border-yellow-200 dark:border-yellow-700">
                              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                ⚠️ Détails de commande non disponibles
                              </p>
                            </div>
                          )}
                          
                          {/* Statut et actions */}
                          <div className="mt-4 pt-3 border-t border-gray-200">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                                  order.statut === 'en_attente' ? 'bg-yellow-100 text-yellow-800' :
                                  order.statut === 'en_preparation' ? 'bg-blue-100 text-blue-800' :
                                  order.statut === 'en_livraison' ? 'bg-purple-100 text-purple-800' :
                                  order.statut === 'livree' ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200' :
                                  order.statut === 'annulee' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' :
                                  'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                                }`}>
                                  {order.statut === 'en_attente' ? 'En attente' :
                                   order.statut === 'en_preparation' ? 'En préparation' :
                                   order.statut === 'en_livraison' ? 'En livraison' :
                                   order.statut === 'livree' ? 'Livrée' :
                                   order.statut === 'annulee' ? 'Annulée' :
                                   order.statut || 'Inconnu'}
                                </span>
                              </div>
                              
                              <div className="flex flex-wrap gap-2 justify-end">
                                {order.statut === 'en_attente' && (
                                  <>
                                    <button
                                      onClick={() => updateOrderStatus(order.id, 'acceptee')}
                                      className="bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 transition-colors"
                                    >
                                      Accepter
                                    </button>
                                    <button
                                      onClick={() => {
                                        setSelectedOrderId(order.id);
                                        setRejectionReason('');
                                        setShowRejectionModal(true);
                                      }}
                                      className="bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700 transition-colors"
                                    >
                                      Refuser
                                    </button>
                                  </>
                                )}
                                {order.statut === 'en_preparation' && !order.livreur_id && !order.ready_for_delivery && (
                                  <button
                                    onClick={() => updateOrderStatus(order.id, 'pret_a_livrer')}
                                    className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition-colors"
                                  >
                                    Marquer comme prête
                                  </button>
                                )}
                                {order.statut === 'en_preparation' && order.ready_for_delivery && !order.livreur_id && (
                                  <span className="text-sm text-green-600 px-3 py-2 font-medium">
                                    ✓ Prête pour livraison
                                  </span>
                                )}
                                {order.statut === 'en_preparation' && order.livreur_id && (
                                  <span className="text-sm text-gray-600 dark:text-gray-300 px-3 py-2">
                                    En attente du livreur
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
                onClick={() => setShowMenuModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Ajouter un plat
              </button>
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
                                      console.error('Erreur parsing suppléments:', e);
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
                    <option value="">Selectionner une categorie</option>
                    {CATEGORY_OPTIONS.map((option) => (
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
                {menuForm.supplements.length > 0 && (
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
                          const newMeat = { id: `meat-${Date.now()}`, nom: '', prix: 0, default: false };
                          setMenuForm({...menuForm, meat_options: [...menuForm.meat_options, newMeat]});
                        }}
                        className="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition-colors text-sm"
                      >
                        + Ajouter viande
                      </button>
                    </div>
                    {menuForm.meat_options.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {menuForm.meat_options.map((meat, index) => (
                          <div key={meat.id || index} className="grid grid-cols-1 md:grid-cols-4 gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
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
                    {menuForm.sauce_options.length > 0 && (
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
                    {menuForm.base_ingredients.length > 0 && (
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
                    setMenuForm({ 
                      nom: '', 
                      description: '', 
                      prix: '', 
                      category: '', 
                      disponible: true,
                      image_url: '',
                      supplements: [],
                      boisson_taille: '',
                      prix_taille: '',
                      meat_options: [],
                      sauce_options: [],
                      base_ingredients: [],
                      requires_meat_selection: false,
                      requires_sauce_selection: false
                    });
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

      {/* Modal pour ajouter un supplément */}
      {showSupplementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 w-full max-w-md">
            <h4 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Ajouter un supplément</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nom du supplément
                </label>
                <input
                  type="text"
                  value={supplementForm.nom}
                  onChange={(e) => setSupplementForm({...supplementForm, nom: e.target.value})}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="ex: Extra fromage, Bacon, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Prix (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={supplementForm.prix || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSupplementForm({...supplementForm, prix: value === '' ? 0 : parseFloat(value) || 0});
                  }}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                  className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 py-2 px-4 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal pour sélectionner le temps de préparation */}
      {showPreparationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Temps de préparation estimé
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Sélectionnez le temps de préparation estimé pour cette commande. Le client sera informé et pourra annuler si c'est trop long.
            </p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Temps de préparation
              </label>
              <select
                value={preparationTime}
                onChange={(e) => setPreparationTime(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={20}>20 minutes</option>
                <option value={25}>25 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={35}>35 minutes</option>
                <option value={40}>40 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={50}>50 minutes</option>
                <option value={60}>60 minutes</option>
              </select>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  updateOrderStatus(selectedOrderId, 'acceptee', preparationTime);
                  setShowPreparationModal(false);
                  setSelectedOrderId(null);
                }}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-semibold"
              >
                Confirmer ({preparationTime} min)
              </button>
              <button
                onClick={() => {
                  setShowPreparationModal(false);
                  setSelectedOrderId(null);
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors dark:text-gray-300"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de refus avec raison */}
      {showRejectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Refuser la commande
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Veuillez indiquer la raison du refus. Cette information sera communiquée au client.
            </p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Raison du refus *
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Ex: Produits non disponibles, restaurant fermé, commande trop importante..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Minimum 10 caractères requis
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  if (rejectionReason.trim().length < 10) {
                    alert('Veuillez saisir une raison d\'au moins 10 caractères');
                    return;
                  }
                  updateOrderStatus(selectedOrderId, 'refusee', null, rejectionReason);
                  setShowRejectionModal(false);
                  setSelectedOrderId(null);
                  setRejectionReason('');
                }}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-semibold"
              >
                Confirmer le refus
              </button>
              <button
                onClick={() => {
                  setShowRejectionModal(false);
                  setSelectedOrderId(null);
                  setRejectionReason('');
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors dark:text-gray-300"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal pour créer/modifier une formule */}
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