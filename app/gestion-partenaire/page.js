'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

const joursSemaine = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export default function GestionPartenaire() {
  const [user, setUser] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [menus, setMenus] = useState([]);
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ nom: '', description: '', prix: '', image_url: '', disponible: true });
  const [editId, setEditId] = useState(null);
  const [horaires, setHoraires] = useState({});
  const [categories, setCategories] = useState([]);
  const [newCategorie, setNewCategorie] = useState('');
  const router = useRouter();
  const fileInputRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [createRestoForm, setCreateRestoForm] = useState({
    nom: '',
    description: '',
    adresse: '',
    code_postal: '',
    ville: '',
    telephone: '',
    email: '',
    type_cuisine: '',
  });
  const [createRestoError, setCreateRestoError] = useState('');
  const [createRestoSuccess, setCreateRestoSuccess] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
        return;
      }
      // Vérifier le rôle
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();
      if (userError || !userData || userData.role !== 'restaurant') {
        router.push('/');
        return;
      }
      setUser(session.user);
      // Récupérer le restaurant
      const { data: resto, error: restoError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
      if (restoError || !resto) {
        setError('Aucun restaurant associé à ce compte.');
        setLoading(false);
        return;
      }
      setRestaurant(resto);
      setHoraires(resto.horaires || {});
      setCategories(resto.categories || []);
      // Récupérer les menus
      const { data: menusData, error: menusError } = await supabase
        .from('menus')
        .select('*')
        .eq('restaurant_id', resto.id)
        .order('created_at', { ascending: false });
      if (menusError) setError(menusError.message);
      setMenus(menusData || []);
      // Récupérer les commandes (sans jointure)
      const { data: commandesData, error: commandesError } = await supabase
        .from('commandes')
        .select('*, commande_details(*, menus(*))')
        .eq('restaurant_id', resto.id)
        .order('created_at', { ascending: false });
      if (commandesError) setError(commandesError.message);
      // Pour chaque commande, récupérer l'utilisateur associé
      const commandesWithUser = [];
      for (const cmd of commandesData || []) {
        const { data: userData } = await supabase
          .from('users')
          .select('nom, prenom, email')
          .eq('id', cmd.user_id)
          .single();
        commandesWithUser.push({ ...cmd, user: userData });
      }
      setCommandes(commandesWithUser);
      setLoading(false);
    };
    fetchData();
  }, [router]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    if (!form.nom || !form.prix) {
      setError('Nom et prix sont obligatoires.');
      setLoading(false);
      return;
    }
    if (editId) {
      // Modification
      const { error } = await supabase
        .from('menus')
        .update({ ...form, prix: parseFloat(form.prix) })
        .eq('id', editId);
      if (error) setError(error.message);
      else setSuccess('Menu modifié !');
    } else {
      // Ajout
      const { error } = await supabase
        .from('menus')
        .insert({ ...form, prix: parseFloat(form.prix), restaurant_id: restaurant.id });
      if (error) setError(error.message);
      else setSuccess('Menu ajouté !');
    }
    setForm({ nom: '', description: '', prix: '', image_url: '', disponible: true });
    setEditId(null);
    // Refresh menus
    const { data: menusData } = await supabase
      .from('menus')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('created_at', { ascending: false });
    setMenus(menusData || []);
    setLoading(false);
  };

  const handleEdit = (menu) => {
    setForm({
      nom: menu.nom,
      description: menu.description,
      prix: menu.prix,
      image_url: menu.image_url,
      disponible: menu.disponible,
    });
    setEditId(menu.id);
  };

  const handleDelete = async (id) => {
    setLoading(true);
    setError('');
    setSuccess('');
    const { error } = await supabase.from('menus').delete().eq('id', id);
    if (error) setError(error.message);
    else setSuccess('Menu supprimé !');
    // Refresh menus
    const { data: menusData } = await supabase
      .from('menus')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('created_at', { ascending: false });
    setMenus(menusData || []);
    setLoading(false);
  };

  // Gestion horaires
  const handleHoraireChange = (jour, champ, value) => {
    setHoraires((prev) => ({
      ...prev,
      [jour]: { ...prev[jour], [champ]: value },
    }));
  };

  // Gestion catégories
  const addCategorie = async () => {
    if (!newCategorie.trim()) return;
    const newCats = [...categories, newCategorie.trim()];
    setCategories(newCats);
    setNewCategorie('');
    await supabase.from('restaurants').update({ categories: newCats }).eq('id', restaurant.id);
  };
  const removeCategorie = async (cat) => {
    const newCats = categories.filter((c) => c !== cat);
    setCategories(newCats);
    await supabase.from('restaurants').update({ categories: newCats }).eq('id', restaurant.id);
  };

  // Gestion commandes
  const updateStatutCommande = async (id, statut) => {
    await supabase.from('commandes').update({ statut }).eq('id', id);
    // Refresh commandes (après update statut)
    const { data: commandesData } = await supabase
      .from('commandes')
      .select('*, commande_details(*, menus(*))')
      .eq('restaurant_id', restaurant.id)
      .order('created_at', { ascending: false });
    const commandesWithUser = [];
    for (const cmd of commandesData || []) {
      const { data: userData } = await supabase
        .from('users')
        .select('nom, prenom, email')
        .eq('id', cmd.user_id)
        .single();
      commandesWithUser.push({ ...cmd, user: userData });
    }
    setCommandes(commandesWithUser);
  };

  // Activation de la mise en avant (pub)
  const activerMiseEnAvant = async () => {
    setLoading(true);
    setSuccess('');
    setError('');
    const fin = new Date();
    fin.setDate(fin.getDate() + 7); // 7 jours de pub
    const { error } = await supabase
      .from('restaurants')
      .update({ mise_en_avant: true, mise_en_avant_fin: fin.toISOString() })
      .eq('id', restaurant.id);
    if (error) setError(error.message);
    else setSuccess('Votre restaurant est maintenant sponsorisé pour 7 jours !');
    // Refresh restaurant
    const { data: resto } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', restaurant.id)
      .single();
    setRestaurant(resto);
    setLoading(false);
  };

  // Fonction d'upload d'image
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const filePath = `menus/${restaurant.id}_${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('menu-images').upload(filePath, file);
    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from('menu-images').getPublicUrl(filePath);
    setForm((prev) => ({ ...prev, image_url: data.publicUrl }));
    setUploading(false);
  };

  if (loading) return <div className="p-8 text-center">Chargement...</div>;
  if (!restaurant) return (
    <div className="max-w-xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Créer votre restaurant</h1>
      {createRestoSuccess && <div className="mb-4 p-2 bg-green-100 text-green-700 rounded">{createRestoSuccess}</div>}
      {createRestoError && <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">{createRestoError}</div>}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setCreateRestoError('');
          setCreateRestoSuccess('');
          if (!createRestoForm.nom || !createRestoForm.adresse || !createRestoForm.ville || !createRestoForm.telephone || !createRestoForm.email || !createRestoForm.type_cuisine) {
            setCreateRestoError('Tous les champs sont obligatoires.');
            return;
          }
          const { data, error } = await supabase
            .from('restaurants')
            .insert({
              ...createRestoForm,
              user_id: user.id,
              status: 'active',
            })
            .select()
            .single();
          if (error) {
            setCreateRestoError(error.message);
          } else {
            setCreateRestoSuccess('Restaurant créé avec succès !');
            setRestaurant(data);
          }
        }}
        className="space-y-4 bg-white p-6 rounded shadow"
      >
        <div>
          <label className="block text-sm font-medium">Nom</label>
          <input type="text" className="input-primary" value={createRestoForm.nom} onChange={e => setCreateRestoForm(f => ({ ...f, nom: e.target.value }))} required />
        </div>
        <div>
          <label className="block text-sm font-medium">Description</label>
          <textarea className="input-primary" value={createRestoForm.description} onChange={e => setCreateRestoForm(f => ({ ...f, description: e.target.value }))} rows={2} />
        </div>
        <div>
          <label className="block text-sm font-medium">Adresse</label>
          <input type="text" className="input-primary" value={createRestoForm.adresse} onChange={e => setCreateRestoForm(f => ({ ...f, adresse: e.target.value }))} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Code postal</label>
            <input type="text" className="input-primary" value={createRestoForm.code_postal} onChange={e => setCreateRestoForm(f => ({ ...f, code_postal: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-sm font-medium">Ville</label>
            <input type="text" className="input-primary" value={createRestoForm.ville} onChange={e => setCreateRestoForm(f => ({ ...f, ville: e.target.value }))} required />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium">Téléphone</label>
          <input type="text" className="input-primary" value={createRestoForm.telephone} onChange={e => setCreateRestoForm(f => ({ ...f, telephone: e.target.value }))} required />
        </div>
        <div>
          <label className="block text-sm font-medium">Email</label>
          <input type="email" className="input-primary" value={createRestoForm.email} onChange={e => setCreateRestoForm(f => ({ ...f, email: e.target.value }))} required />
        </div>
        <div>
          <label className="block text-sm font-medium">Type de cuisine</label>
          <select className="input-primary" value={createRestoForm.type_cuisine} onChange={e => setCreateRestoForm(f => ({ ...f, type_cuisine: e.target.value }))} required>
            <option value="">Sélectionner</option>
            <option value="Française">Française</option>
            <option value="Italienne">Italienne</option>
            <option value="Japonaise">Japonaise</option>
            <option value="Indienne">Indienne</option>
            <option value="Fast-Food">Fast-Food</option>
            <option value="Végétarienne">Végétarienne</option>
            <option value="Autre">Autre</option>
          </select>
        </div>
        <div className="flex justify-end">
          <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">Créer le restaurant</button>
        </div>
      </form>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-12">
      <h1 className="text-2xl font-bold mb-6">Gestion partenaire</h1>
      {restaurant.mise_en_avant && restaurant.mise_en_avant_fin && new Date(restaurant.mise_en_avant_fin) > new Date() && (
        <div className="mb-4 p-2 bg-yellow-100 text-yellow-800 rounded font-bold inline-block">
          Votre restaurant est <span className="text-orange-600">Sponsorisé</span> jusqu'au {new Date(restaurant.mise_en_avant_fin).toLocaleDateString()}
        </div>
      )}
      <button
        onClick={activerMiseEnAvant}
        className="mb-4 bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600"
        disabled={loading || (restaurant.mise_en_avant && restaurant.mise_en_avant_fin && new Date(restaurant.mise_en_avant_fin) > new Date())}
      >
        {restaurant.mise_en_avant && restaurant.mise_en_avant_fin && new Date(restaurant.mise_en_avant_fin) > new Date()
          ? 'Déjà sponsorisé'
          : 'Payer une mise en avant (7 jours)'}
      </button>
      {success && <div className="mb-4 p-2 bg-green-100 text-green-700 rounded">{success}</div>}
      {error && <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">{error}</div>}

      {/* Formulaire de modification des infos du restaurant */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-4">Informations du restaurant</h2>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);
            setSuccess('');
            setError('');
            const { error } = await supabase
              .from('restaurants')
              .update({
                nom: restaurant.nom,
                description: restaurant.description,
                adresse: restaurant.adresse,
                telephone: restaurant.telephone,
                ville: restaurant.ville,
                code_postal: restaurant.code_postal,
              })
              .eq('id', restaurant.id);
            if (error) setError(error.message);
            else setSuccess('Informations du restaurant mises à jour !');
            setLoading(false);
          }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded shadow mb-6"
        >
          <div>
            <label className="block text-sm font-medium">Nom</label>
            <input
              type="text"
              value={restaurant.nom || ''}
              onChange={e => setRestaurant(r => ({ ...r, nom: e.target.value }))}
              className="input-primary"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Téléphone</label>
            <input
              type="text"
              value={restaurant.telephone || ''}
              onChange={e => setRestaurant(r => ({ ...r, telephone: e.target.value }))}
              className="input-primary"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium">Description</label>
            <textarea
              value={restaurant.description || ''}
              onChange={e => setRestaurant(r => ({ ...r, description: e.target.value }))}
              className="input-primary"
              rows={2}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Adresse</label>
            <input
              type="text"
              value={restaurant.adresse || ''}
              onChange={e => setRestaurant(r => ({ ...r, adresse: e.target.value }))}
              className="input-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Ville</label>
            <input
              type="text"
              value={restaurant.ville || ''}
              onChange={e => setRestaurant(r => ({ ...r, ville: e.target.value }))}
              className="input-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Code postal</label>
            <input
              type="text"
              value={restaurant.code_postal || ''}
              onChange={e => setRestaurant(r => ({ ...r, code_postal: e.target.value }))}
              className="input-primary"
            />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
              disabled={loading}
            >
              Sauvegarder
            </button>
          </div>
        </form>
      </section>

      {/* Section Menus */}
      <section>
        <h2 className="text-xl font-bold mb-4">Menus</h2>
        <form onSubmit={handleSubmit} className="space-y-4 mb-8">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Nom du plat</label>
              <input type="text" name="nom" value={form.nom} onChange={handleChange} className="input-primary" required />
            </div>
            <div>
              <label className="block text-sm font-medium">Prix (€)</label>
              <input type="number" step="0.01" name="prix" value={form.prix} onChange={handleChange} className="input-primary" required />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium">Description</label>
              <textarea name="description" value={form.description} onChange={handleChange} className="input-primary" rows={2} />
            </div>
            <div>
              <label className="block text-sm font-medium">Image</label>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageUpload}
                className="input-primary"
                disabled={uploading}
              />
              {form.image_url && (
                <img src={form.image_url} alt="aperçu" className="mt-2 w-24 h-24 object-cover rounded" />
              )}
            </div>
            <div className="flex items-center">
              <label className="block text-sm font-medium mr-2">Disponible</label>
              <input type="checkbox" name="disponible" checked={form.disponible} onChange={handleChange} />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700" disabled={loading || uploading}>
              {editId ? 'Modifier' : 'Ajouter'}
            </button>
          </div>
        </form>
        <h3 className="text-lg font-bold mb-2">Liste des menus</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {menus.map((menu) => (
            <div key={menu.id} className="bg-white rounded shadow p-4 flex gap-4 items-center">
              {menu.image_url && (
                <img src={menu.image_url} alt={menu.nom} className="w-24 h-24 object-cover rounded" />
              )}
              <div className="flex-1">
                <h3 className="font-bold text-lg">{menu.nom}</h3>
                <p className="text-gray-600">{menu.description}</p>
                <p className="text-orange-600 font-bold">{menu.prix} €</p>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => handleEdit(menu)} className="px-3 py-1 bg-yellow-400 text-white rounded">Modifier</button>
                  <button onClick={() => handleDelete(menu.id)} className="px-3 py-1 bg-red-500 text-white rounded">Supprimer</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section Horaires */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-4">Horaires d'ouverture</h2>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);
            setSuccess('');
            setError('');
            const { error } = await supabase
              .from('restaurants')
              .update({ horaires })
              .eq('id', restaurant.id);
            if (error) setError(error.message);
            else setSuccess('Horaires mis à jour !');
            setLoading(false);
          }}
          className="space-y-4 bg-white p-4 rounded shadow"
        >
          {joursSemaine.map((jour) => (
            <div key={jour} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
              <div className="font-medium">{jour}</div>
              <div>
                <label className="block text-xs text-gray-500">Ouverture</label>
                <input
                  type="time"
                  value={horaires[jour]?.ouverture || ''}
                  onChange={e => handleHoraireChange(jour, 'ouverture', e.target.value)}
                  className="input-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Fermeture</label>
                <input
                  type="time"
                  value={horaires[jour]?.fermeture || ''}
                  onChange={e => handleHoraireChange(jour, 'fermeture', e.target.value)}
                  className="input-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Fermé</label>
                <input
                  type="checkbox"
                  checked={horaires[jour]?.ferme || false}
                  onChange={e => handleHoraireChange(jour, 'ferme', e.target.checked)}
                  className="h-5 w-5"
                />
              </div>
            </div>
          ))}
          <div className="flex justify-end mt-4">
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
              disabled={loading}
            >
              Sauvegarder les horaires
            </button>
          </div>
        </form>
      </section>

      {/* Section Catégories */}
      <section>
        <h2 className="text-xl font-bold mb-4">Catégories</h2>
        <div className="flex space-x-2 mb-4">
          <input type="text" value={newCategorie} onChange={e => setNewCategorie(e.target.value)} className="input-primary" placeholder="Nouvelle catégorie" />
          <button onClick={addCategorie} className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600">Ajouter</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <span key={cat} className="bg-gray-200 px-3 py-1 rounded-full flex items-center">
              {cat}
              <button onClick={() => removeCategorie(cat)} className="ml-2 text-red-600 hover:underline">&times;</button>
            </span>
          ))}
        </div>
      </section>

      {/* Section Commandes */}
      <section>
        <h2 className="text-xl font-bold mb-4">Commandes reçues</h2>
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">Date</th>
              <th className="p-2">Client</th>
              <th className="p-2">Plats</th>
              <th className="p-2">Total</th>
              <th className="p-2">Statut</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {commandes.map((cmd) => (
              <tr key={cmd.id} className="border-t">
                <td className="p-2">{new Date(cmd.created_at).toLocaleString()}</td>
                <td className="p-2">{cmd.user?.prenom} {cmd.user?.nom}<br />{cmd.user?.email}</td>
                <td className="p-2">
                  {cmd.commande_details?.map((cd) => (
                    <div key={cd.id}>{cd.menus?.nom} x{cd.quantite}</div>
                  ))}
                </td>
                <td className="p-2">{cmd.total} €</td>
                <td className="p-2">{cmd.statut}</td>
                <td className="p-2">
                  <select value={cmd.statut} onChange={e => updateStatutCommande(cmd.id, e.target.value)} className="input-primary">
                    <option value="en_attente">En attente</option>
                    <option value="en_preparation">En préparation</option>
                    <option value="en_livraison">En livraison</option>
                    <option value="livree">Livrée</option>
                    <option value="annulee">Annulée</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
} 