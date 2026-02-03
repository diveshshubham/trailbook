type FeedCardProps = {
    data: {
      imageUrl: string;
      user: string;
      caption: string;
      tags: string[];
      avatar: string;
    };
  };
  
  export default function FeedCard({ data }: FeedCardProps) {
    return (
        <div className="mb-4 break-inside-avoid rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition">
        <div className="relative group">
          <img
            src={data.imageUrl}
            alt="feed"
            className="w-full object-cover max-h-[500px]"
          />
          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
            <p className="text-white text-sm font-medium">
              {data.caption}
            </p>
  
            <div className="flex flex-wrap gap-2 mt-2">
              {data.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs font-bold text-orange-400"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>
  
       {/* Footer */}
<div className="p-3 flex items-center gap-3">
  {/* Avatar */}
  <div className="relative group/avatar">
    <img
      src={data.avatar}
      alt={data.user}
      className="w-8 h-8 rounded-full object-cover transition-transform duration-300 group-hover/avatar:scale-125"
    />
  </div>

  {/* Username */}
  <p className="font-semibold text-sm">{data.user}</p>
</div>
      </div>
    );
  }
  