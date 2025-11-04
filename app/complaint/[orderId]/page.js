'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import PageHeader from '../../../components/PageHeader';
import { 
  FaExclamationTriangle, 
  FaCamera, 
  FaUpload, 
  FaTimes,
  FaCheck,
  FaSpinner
} from 'react-icons/fa';

export default function ComplaintForm({ params }) {
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  const [formData, setFormData] = useState({
    complaintType: '',
    title: '',
    description: '',
    requestedRefundAmount: '',
    evidenceDescription: ''
  });

  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);

  const complaintTypes = [
    { value: 'food_quality', label: 'Qualité de la nourriture', icon: '🍽️' },
    { value: 'delivery_issue', label: 'Problème de livraison', icon: '🚚' },
    { value: 'missing_items', label: 'Articles manquants', icon: '📦' },
    { value: 'wrong_order', label: 'Mauvaise commande', icon: '❌' },
    { value: 'other', label: 'Autre', icon: '❓' }
  ];

  useEffect(() => {
    fetchOrderData();
  }, [params.orderId]);

  const fetchOrderData = async () => {
    try {
      setLoading(true);
      
      // Vérifier l'authentification
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError || !session?.user) {
        router.push('/login');
        return;
      }

      setUser(session.user);

      // Récupérer la commande
      const { data: orderData, error: orderError } = await supabase
        .from('commandes')
        .select(`
          *,
          restaurant:restaurants(nom, adresse)
        `)
        .eq('id', params.orderId)
        .eq('user_id', session.user.id)
        .eq('statut', 'livree')
        .single();

      if (orderError || !orderData) {
        setError('Commande non trouvée ou non livrée');
        return;
      }

      // Vérifier le délai de réclamation (1h min, 48h max)
      const orderTime = new Date(orderData.created_at);
      const now = new Date();
      const hoursDiff = (now - orderTime) / (1000 * 60 * 60);

      if (hoursDiff > 48) {
        setError('Délai de réclamation dépassé (48h maximum après la livraison)');
        return;
      }

      if (hoursDiff < 1) {
        setError('Réclamation trop tôt (minimum 1 heure après la livraison)');
        return;
      }

      setOrder(orderData);
      
      // Initialiser le montant de remboursement
      const orderTotal = parseFloat(orderData.total || orderData.total_amount || 0);
      setFormData(prev => ({
        ...prev,
        requestedRefundAmount: orderTotal.toString()
      }));

    } catch (err) {
      console.error('Erreur récupération commande:', err);
      setError('Erreur lors du chargement de la commande');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    const uploadedPhotos = [];

    try {
      for (const file of files) {
        // Vérifier la taille du fichier (5MB max)
        if (file.size > 5 * 1024 * 1024) {
          alert(`Le fichier ${file.name} est trop volumineux (5MB max)`);
          continue;
        }

        // Vérifier le type de fichier
        if (!file.type.startsWith('image/')) {
          alert(`Le fichier ${file.name} n'est pas une image`);
          continue;
        }

        // Upload vers Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `complaint-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        const { data, error } = await supabase.storage
          .from('complaint-evidence')
          .upload(fileName, file);

        if (error) {
          console.error('Erreur upload:', error);
          alert(`Erreur lors de l'upload de ${file.name}`);
          continue;
        }

        // Récupérer l'URL publique
        const { data: { publicUrl } } = supabase.storage
          .from('complaint-evidence')
          .getPublicUrl(fileName);

        uploadedPhotos.push({
          url: publicUrl,
          name: file.name,
          size: file.size
        });
      }

      setPhotos(prev => [...prev, ...uploadedPhotos]);
    } catch (err) {
      console.error('Erreur upload photos:', err);
      alert('Erreur lors de l\'upload des photos');
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // Validation
      if (!formData.complaintType || !formData.title || !formData.description || !formData.requestedRefundAmount) {
        throw new Error('Tous les champs obligatoires doivent être remplis');
      }

      if (parseFloat(formData.requestedRefundAmount) <= 0) {
        throw new Error('Le montant de remboursement doit être positif');
      }

      const orderTotal = parseFloat(order.total || order.total_amount || 0);
      if (parseFloat(formData.requestedRefundAmount) > orderTotal) {
        throw new Error('Le montant de remboursement ne peut pas dépasser le total de la commande');
      }

      // Récupérer le token d'authentification
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('Session expirée, veuillez vous reconnecter');
      }

      // Envoyer la réclamation
      const response = await fetch('/api/complaints', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          orderId: params.orderId,
          complaintType: formData.complaintType,
          title: formData.title,
          description: formData.description,
          requestedRefundAmount: parseFloat(formData.requestedRefundAmount),
          evidenceDescription: formData.evidenceDescription,
          photos: photos.map(p => p.url)
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la création de la réclamation');
      }

      // Succès
      alert('Réclamation créée avec succès ! Nous examinerons votre demande dans les plus brefs délais.');
      router.push(`/profile/orders/${params.orderId}`);

    } catch (err) {
      console.error('Erreur soumission réclamation:', err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <PageHeader 
          title="Réclamation" 
          icon={FaExclamationTriangle}
          showBackButton={true}
        />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 text-center">
            <FaExclamationTriangle className="text-red-500 text-4xl mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Impossible de créer une réclamation
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
            <button
              onClick={() => router.back()}
                  className="bg-blue-600 dark:bg-blue-700 text-white px-6 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors"
            >
              Retour
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <PageHeader 
          title="Réclamation" 
          icon={FaExclamationTriangle}
          showBackButton={true}
        />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">Commande non trouvée</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader 
        title="Signaler un problème" 
        icon={FaExclamationTriangle}
        showBackButton={true}
      />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Informations de la commande */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Commande #{order.order_number || order.id}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600 dark:text-gray-400">Restaurant</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{order.restaurant.nom}</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Montant total</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{parseFloat(order.total || order.total_amount || 0).toFixed(2)}€</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Date de livraison</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {new Date(order.created_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Heure de livraison</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {new Date(order.created_at).toLocaleTimeString('fr-FR')}
                </p>
              </div>
            </div>
          </div>

          {/* Formulaire de réclamation */}
          <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
              Détails de votre réclamation
            </h2>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                <p className="text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="space-y-6">
              {/* Type de problème */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Type de problème *
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {complaintTypes.map((type) => (
                    <label key={type.value} className="flex items-center p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                      <input
                        type="radio"
                        name="complaintType"
                        value={type.value}
                        checked={formData.complaintType === type.value}
                        onChange={handleInputChange}
                        className="sr-only"
                      />
                      <span className="text-2xl mr-3">{type.icon}</span>
                      <span className="text-gray-900 dark:text-gray-100">{type.label}</span>
                      {formData.complaintType === type.value && (
                        <FaCheck className="text-green-500 ml-auto" />
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {/* Titre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Titre de votre réclamation *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Ex: Commande froide et incomplète"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description détaillée *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder="Décrivez en détail le problème rencontré..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                  required
                />
              </div>

              {/* Montant de remboursement */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Montant de remboursement demandé (€) *
                </label>
                <input
                  type="number"
                  name="requestedRefundAmount"
                  value={formData.requestedRefundAmount}
                  onChange={handleInputChange}
                  min="0"
                  max={parseFloat(order.total || order.total_amount || 0)}
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                  required
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Maximum: {(parseFloat(order.total || order.total_amount || 0) * 0.7).toFixed(2)}€ (70% du total). 
                  <span className="text-orange-600 dark:text-orange-400"> Minimum: 5€ pour commandes &gt; 10€</span>
                </p>
              </div>

              {/* Preuves */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Photos (optionnel)
                </label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    id="photo-upload"
                  />
                  <label htmlFor="photo-upload" className="cursor-pointer">
                    <FaCamera className="text-4xl text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 dark:text-gray-400 mb-2">
                      {uploading ? 'Upload en cours...' : 'Cliquez pour ajouter des photos'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Formats acceptés: JPG, PNG, GIF (5MB max par photo)
                    </p>
                  </label>
                </div>

                {/* Photos uploadées */}
                {photos.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                    {photos.map((photo, index) => (
                      <div key={index} className="relative">
                        <img
                          src={photo.url}
                          alt={`Preuve ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <FaTimes className="text-xs" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Description des preuves */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description des preuves (optionnel)
                </label>
                <textarea
                  name="evidenceDescription"
                  value={formData.evidenceDescription}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Expliquez ce que montrent les photos..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                />
              </div>

              {/* Bouton de soumission */}
              <div className="pt-6">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-orange-600 dark:bg-orange-700 text-white py-3 px-6 rounded-lg hover:bg-orange-700 dark:hover:bg-orange-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  {submitting ? (
                    <>
                      <FaSpinner className="animate-spin mr-2" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <FaCheck className="mr-2" />
                      Envoyer la réclamation
                    </>
                  )}
                </button>
              </div>

              {/* Avertissement */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-yellow-800 dark:text-yellow-400 text-sm">
                  <strong>Important :</strong> Les réclamations abusives peuvent entraîner la suspension de votre compte. 
                  Veuillez fournir des informations précises et des preuves si possible.
                </p>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
