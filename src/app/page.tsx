import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            PMP - Photo Management Platform
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Gérez, traitez et publiez vos photos avec une plateforme complète et intuitive.
          </p>

          <div className="flex justify-center space-x-4 mb-12">
            <Link href="/login" className="btn-primary">
              Se connecter
            </Link>
            <Link href="/gallery" className="btn-secondary">
              Voir la galerie
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-16">
          <div className="card text-center">
            <div className="text-4xl mb-4">📸</div>
            <h3 className="text-xl font-semibold mb-2">Galerie Interactive</h3>
            <p className="text-gray-600">
              Visualisez et organisez vos photos avec une interface moderne et intuitive.
            </p>
          </div>

          <div className="card text-center">
            <div className="text-4xl mb-4">✂️</div>
            <h3 className="text-xl font-semibold mb-2">Recadrage Intelligent</h3>
            <p className="text-gray-600">
              Recadrez vos images avec des outils avancés et une précision optimale.
            </p>
          </div>

          <div className="card text-center">
            <div className="text-4xl mb-4">📅</div>
            <h3 className="text-xl font-semibold mb-2">Calendrier Intégré</h3>
            <p className="text-gray-600">
              Organisez vos photos par date et retrouvez facilement vos souvenirs.
            </p>
          </div>

          <div className="card text-center">
            <div className="text-4xl mb-4">🔄</div>
            <h3 className="text-xl font-semibold mb-2">Tri Automatique</h3>
            <p className="text-gray-600">
              Classez intelligemment vos images avec des algorithmes de reconnaissance.
            </p>
          </div>

          <div className="card text-center">
            <div className="text-4xl mb-4">📝</div>
            <h3 className="text-xl font-semibold mb-2">Descriptions</h3>
            <p className="text-gray-600">
              Ajoutez des métadonnées et descriptions personnalisées à vos photos.
            </p>
          </div>

          <div className="card text-center">
            <div className="text-4xl mb-4">🚀</div>
            <h3 className="text-xl font-semibold mb-2">Publication</h3>
            <p className="text-gray-600">
              Publiez facilement vos photos sur les réseaux sociaux en quelques clics.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
