export default function FeedSkeleton() {
    return (
      <div className="mb-4 break-inside-avoid rounded-xl overflow-hidden bg-white shadow-sm animate-pulse">
        
        {/* Image placeholder */}
        <div className="h-60 bg-gray-300" />
  
        {/* Text placeholders */}
        <div className="p-3 space-y-2">
          <div className="h-3 bg-gray-300 rounded w-1/3" />
          <div className="h-3 bg-gray-200 rounded w-2/3" />
        </div>
      </div>
    );
  }
  