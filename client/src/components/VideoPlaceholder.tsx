import { useState } from 'react';

interface VideoPlaceholderProps {
  title?: string;
  description?: string;
  aspectRatio?: '16/9' | '4/3' | '1/1';
  videoUrl?: string;
}

export default function VideoPlaceholder({
  title = 'Video Coming Soon',
  description = 'Check back soon for our video content',
  aspectRatio = '16/9',
  videoUrl,
}: VideoPlaceholderProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const aspectRatioClass = {
    '16/9': 'aspect-video',
    '4/3': 'aspect-[4/3]',
    '1/1': 'aspect-square',
  }[aspectRatio];

  if (videoUrl) {
    return (
      <div className={`relative w-full ${aspectRatioClass} bg-black rounded-lg overflow-hidden`}>
        {!isPlaying ? (
          <div
            className="absolute inset-0 flex items-center justify-center cursor-pointer group"
            onClick={() => setIsPlaying(true)}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />
            <div className="relative z-10 flex flex-col items-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center group-hover:bg-primary transition-colors">
                <svg
                  className="w-10 h-10 text-white ml-1"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              {title && (
                <p className="text-white text-lg font-semibold">{title}</p>
              )}
            </div>
          </div>
        ) : (
          <iframe
            className="absolute inset-0 w-full h-full"
            src={videoUrl}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        )}
      </div>
    );
  }

  // Placeholder when no video URL is provided
  return (
    <div className={`relative w-full ${aspectRatioClass} bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg overflow-hidden border-2 border-dashed border-primary/30`}>
      <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-4">
          <svg
            className="w-10 h-10 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
