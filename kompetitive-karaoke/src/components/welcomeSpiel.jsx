import '../App.css' 

function WelcomeSpiel() {
  return (
        <main className="flex flex-col items-center justify-center px-6 py-16 text-center bg-gray-900">
                <h1 className="text-4xl font-bold text-white mb-4">
                Welcome to Kompetitive Karaoke!
                </h1>
                    <p className="text-lg text-gray-300 max-w-xl mb-6">
                        A competitive karaoke platform where you can showcase your singing skills,
                        explore other users' performances, and participate in live challenges.
                    </p>
                    <p className="text-md text-gray-400 max-w-xl mb-8">
                        To get started, browse the available rooms, join a session, and sing your heart out.
                        Your scores will be tracked, and you can see how you rank against other players.
                    </p>
                <button className="px-6 py-3 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 transition">
                    Get Started
                </button>
        </main>
  )
}

export default WelcomeSpiel
