type Album = {
    cover: string;
    title: string;
    photos: number;
    date: string;
  };
  
  export default function AlbumCard({ album }: { album: Album }) {
    if (!album) return null; // 🛡️ safety guard
  
    return (
      <div className="group cursor-pointer">
        <div className="relative rounded-2xl overflow-hidden">
          <img
            src={album.cover}
            alt={album.title}
            className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-105"
          />
  
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-end p-4">
            <p className="text-white text-sm">{album.photos} photos</p>
          </div>
        </div>
  
        <h3 className="mt-3 font-semibold">{album.title}</h3>
        <p className="text-sm text-gray-500">{album.date}</p>
      </div>
    );
  }
  