export default function UserHeader() {
    return (
      <section className="max-w-6xl mx-auto px-6 pt-10 pb-6">
        <div className="flex items-center gap-6">
          <img
            src="/avatar.png"
            alt="user"
            className="w-20 h-20 rounded-full object-cover"
          />
  
          <div>
            <h1 className="text-2xl font-semibold">Shubham</h1>
            <p className="text-gray-500 mt-1">
              Capturing journeys, one trail at a time
            </p>
  
            <div className="flex gap-6 mt-3 text-sm text-gray-600">
              <span><strong>4</strong> Albums</span>
              <span><strong>68</strong> Photos</span>
            </div>
          </div>
        </div>
      </section>
    );
  }
  