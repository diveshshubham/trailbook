export default function UserHero({
  name,
  albumsCount,
  photosCount,
  onCreate,
}: {
  name: string;
  albumsCount: number;
  photosCount: number;
  onCreate: () => void;
}) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm">
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-pink-50" />
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-orange-200/30 blur-3xl" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-pink-200/30 blur-3xl" />

      <div className="relative px-8 py-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-10">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 font-semibold">
            Your Studio
          </p>
          <h1 className="mt-3 text-4xl lg:text-5xl font-bold tracking-tight text-gray-900">
            Welcome back, {name}
          </h1>
          <p className="text-gray-500 mt-3 max-w-2xl leading-relaxed">
            Your personal space to collect journeys, moments, and stories worth remembering.
          </p>

          <div className="mt-7 flex items-center gap-8 text-sm text-gray-600">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-400">Albums</p>
              <p className="text-lg font-semibold text-gray-900">{albumsCount}</p>
            </div>
            <div className="h-8 w-px bg-black/10" />
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-400">Photos</p>
              <p className="text-lg font-semibold text-gray-900">{photosCount}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onCreate}
            className="rounded-full px-7 py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold shadow-lg shadow-orange-500/20 hover:opacity-95 active:scale-95 transition"
          >
            Create new album
          </button>
        </div>
      </div>
    </section>
  );
}
  