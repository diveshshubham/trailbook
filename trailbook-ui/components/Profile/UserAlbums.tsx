import UserHero from "./UserHero";
import AlbumCard from "./AlbumCard";

/**
 * Toggle albums to test
 */

// EMPTY STATE
//const albums: any[] = [];

// WITH CONTENT (uncomment to test)
const albums = [
    {
        id: 1,
        title: "Kedarkantha Winter Trek",
        cover: "https://images.unsplash.com/photo-1501785888041-af3ef285b470",
        photos: 18,
        date: "Jan 2024",
    },
    {
        id: 1,
        title: "Kedarkantha Winter Trek",
        cover: "https://images.unsplash.com/photo-1501785888041-af3ef285b470",
        photos: 18,
        date: "Jan 2024",
    },
    {
        id: 1,
        title: "Kedarkantha Winter Trek",
        cover: "https://images.unsplash.com/photo-1501785888041-af3ef285b470",
        photos: 18,
        date: "Jan 2024",
    },
    {
        id: 1,
        title: "Kedarkantha Winter Trek",
        cover: "https://images.unsplash.com/photo-1501785888041-af3ef285b470",
        photos: 18,
        date: "Jan 2024",
    },
    {
        id: 1,
        title: "Kedarkantha Winter Trek",
        cover: "https://images.unsplash.com/photo-1501785888041-af3ef285b470",
        photos: 18,
        date: "Jan 2024",
    },
];

export default function UserAlbums() {
    const userName = "Shubham";

    return (
        <>
            {/* SHOW HERO ONLY IF ALBUMS EXIST */}
            {/* {albums.length > 0 && <UserHero name={userName} />} */}

            <section className="max-w-6xl mx-auto px-6 pb-24">
                {albums.length === 0 ? (
                    /* ================= EMPTY STATE ================= */
                    <div className="flex items-center justify-center min-h-[60vh]">
                        <div className="bg-white rounded-3xl px-10 py-14 text-center max-w-md shadow-sm">

                            <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-gradient-to-br from-orange-100 to-pink-100 flex items-center justify-center">
                                <span className="text-3xl">📖</span>
                            </div>

                            <h2 className="text-xl font-semibold">
                                Your first story is waiting
                            </h2>

                            <p className="mt-3 text-gray-500 leading-relaxed">
                                Create an album to begin collecting moments, memories,
                                and milestones from your journeys.
                            </p>

                            <button className="
  mt-6 rounded-full px-8 py-3
  bg-gradient-to-r from-orange-500 to-pink-500
  text-white font-semibold
  transition-all duration-200
  hover:scale-105 active:scale-95
  shadow-lg
">
                                Create your first album
                            </button>
                        </div>
                    </div>
                ) : (
                    /* ================= ALBUMS GRID ================= */
                    <>
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-semibold">
                                Your Stories
                            </h2>

                            <button className="rounded-full px-6 py-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold">
                                Create new album
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                            {albums.map((album) => (
                                <AlbumCard key={album.id} album={album} />
                            ))}
                        </div>
                    </>
                )}
            </section>
        </>
    );
}
