import { supabase } from '../lib/supabase'

export default async function TestConnection() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1)

    if (error) {
      return (
        <div className="p-4 bg-red-100 text-red-700 rounded">
          Erreur de connexion : {error.message}
        </div>
      )
    }

    return (
      <div className="p-4 bg-green-100 text-green-700 rounded">
        Connexion à Supabase réussie ! 
        {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
      </div>
    )
  } catch (error) {
    return (
      <div className="p-4 bg-red-100 text-red-700 rounded">
        Erreur : {error.message}
      </div>
    )
  }
} 