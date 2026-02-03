export default function UserHeader({
  name = "Trailblazer",
  avatar,
}: {
  name?: string;
  avatar?: string;
}) {
  return (
    <section className="max-w-6xl mx-auto px-6 pt-10 pb-6">
      <div className="flex items-center gap-6">
        <img
          src={
            avatar ||
            `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(name)}`
          }
          alt="user"
          className="w-20 h-20 rounded-full object-cover ring-2 ring-black/5 shadow-sm"
        />

        <div>
          <h1 className="text-2xl font-semibold">{name}</h1>
          <p className="text-gray-500 mt-1">
            Capturing journeys, one trail at a time
          </p>
        </div>
      </div>
    </section>
  );
}
  