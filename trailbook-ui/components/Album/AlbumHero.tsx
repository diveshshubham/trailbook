type AlbumHeroProps = {
  title?: string;
  coverUrl?: string;
  subtitle?: string;
  isPublic?: boolean;
};

export default function AlbumHero({
  title = "Untitled album",
  coverUrl = "https://images.unsplash.com/photo-1501785888041-af3ef285b470",
  subtitle,
  isPublic,
}: AlbumHeroProps) {
  return (
    <section className="relative h-[70vh] w-full overflow-hidden">
      {/* Background Image with Parallax-like feel */}
      <div className="absolute inset-0">
        <img 
          src={coverUrl} 
          className="w-full h-full object-cover" 
          alt={title} 
        />
        {/* Cinematic Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/10 to-black/80" />
      </div>

      {/* Content Container */}
      <div className="relative h-full max-w-7xl mx-auto px-6 flex flex-col justify-end pb-16">
        <div className="max-w-3xl animate-fadeInUp">
          <div className="flex items-center gap-3 mb-6">
            <span className={`px-4 py-1.5 text-[10px] uppercase tracking-[0.2em] font-bold rounded-full backdrop-blur-md border ${
              isPublic 
                ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" 
                : "bg-orange-500/20 border-orange-500/30 text-orange-400"
            }`}>
              {isPublic ? "Public Story" : "Private Collection"}
            </span>
            {subtitle && (
              <span className="text-white/40 text-[10px] tracking-widest uppercase">
                {subtitle}
              </span>
            )}
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight leading-tight">
            {title}
          </h1>
          
          <div className="mt-8 flex items-center gap-4">
            <div className="h-px w-12 bg-white/30" />
            <p className="text-white/60 text-sm font-light tracking-wide uppercase">
              Curated Moments
            </p>
          </div>
        </div>
      </div>

      {/* Elegant Bottom Edge Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#fafafa] to-transparent" />
    </section>
  );
}
  