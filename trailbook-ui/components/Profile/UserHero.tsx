export default function UserHero({ name }: { name: string }) {
    return (
      <section className="max-w-6xl mx-auto px-6 pt-12 pb-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          
          {/* Text */}
          <div>
            <h1 className="text-3xl font-semibold">
              Welcome back, {name}
            </h1>
  
            <p className="text-gray-500 mt-2 max-w-xl">
              This is your personal space to collect journeys, moments, and stories
              worth remembering.
            </p>
          </div>
  
          {/* CTA */}
          <button className="self-start rounded-full px-6 py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold hover:opacity-90 transition">
            Create new album
          </button>
        </div>
      </section>
    );
  }
  