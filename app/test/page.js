import TestConnection from '../test-connection'

export default function TestPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Test de connexion Supabase</h1>
      <TestConnection />
    </div>
  )
} 