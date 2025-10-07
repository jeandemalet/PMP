import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header public simple */}
      <header className="bg-white shadow-sm">
        <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-xl font-bold text-indigo-600">PMP</div>
          <Link href="/login" legacyBehavior>
            <a className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              Se connecter
            </a>
          </Link>
        </nav>
      </header>

      {/* Contenu de la page */}
      <main className="flex-grow container mx-auto px-6 py-16 text-center flex flex-col justify-center">
        <h1 className="text-5xl font-extrabold text-gray-900 mb-4">
          Bienvenue sur PMP
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          Votre plateforme tout-en-un pour gérer, organiser, et publier vos photos professionnelles.
        </p>
        <div className="flex justify-center">
          <Link href="/login" legacyBehavior>
            <a className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-lg hover:bg-indigo-700 transition-transform transform hover:scale-105">
              Commencer
            </a>
          </Link>
        </div>
      </main>
    </div>
  );
}
