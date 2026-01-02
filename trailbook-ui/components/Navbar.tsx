export default function Navbar() {
    return (
      <nav className="flex justify-between px-6 py-4 border-b">
        <h1 className="font-bold text-xl">TribeAlbum</h1>
        <div className="flex gap-4">
          <a href="/">Home</a>
          <a href="/upload">Upload</a>
        </div>
      </nav>
    );
  }
  