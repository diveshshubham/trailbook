"use client";
import Image from "next/image";


export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-white/70 border-b border-black/5">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

        {/* Logo */}
        <div className="flex items-center gap-4">

          {/* Logo Image */}
          <div className="relative w-14 h-14">

            <Image
              src="/logo.png"
              alt="Trailbook logo"
              fill
              className="object-contain"
              priority
            />
          </div>

          {/* Brand Text */}
          <div className="flex flex-col">
            <span className="text-2xl font-semibold tracking-[0.28em] bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 bg-clip-text text-transparent">
              Trailbook
            </span>

            <span className="text-xs tracking-widest text-gray-500 mt-1 flex items-center gap-2">
              <span className="w-8 h-px bg-gradient-to-r from-transparent via-gray-400 to-transparent" />
              stories from the wild
            </span>
          </div>
        </div>


        {/* Auth CTA */}
        <button className="group relative overflow-hidden rounded-full px-6 py-2">

          {/* Gradient background */}
          <span className="absolute inset-0 bg-gradient-to-r from-orange-500 via-pink-500 to-red-500 transition-all duration-300 group-hover:scale-110" />

          {/* Glass layer */}
          <span className="absolute inset-0 bg-white/20 backdrop-blur-sm" />

          {/* Text */}
          <span className="relative z-10 text-sm font-semibold text-white tracking-wide">
            Login / Sign up
          </span>
        </button>
      </div>
    </header>
  );
}
