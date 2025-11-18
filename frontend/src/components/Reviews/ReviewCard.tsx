import { StarIcon, CheckBadgeIcon } from '@heroicons/react/24/solid';
import { Review } from '../../mocks/reviewData';

interface ReviewCardProps {
  review: Review;
}

// A simple utility to format dates for display
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 2) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
};


export default function ReviewCard({ review }: ReviewCardProps) {
  return (
    <div className="py-6 border-b border-border">
      <div className="flex items-start gap-4">
        {/* Reviewer Initial Circle */}
        <div className="w-12 h-12 rounded-full bg-muted flex-shrink-0 flex items-center justify-center">
          <span className="text-lg font-bold text-foreground">
            {review.reviewerName.charAt(0)}
          </span>
        </div>

        <div className="flex-1">
          {/* Reviewer Info */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-foreground">{review.reviewerName}</p>
              <p className="text-sm text-muted-foreground">{review.reviewerCompany}</p>
            </div>
            <span className="text-sm text-muted-foreground">{formatDate(review.date)}</span>
          </div>

          {/* Star Rating & Verified Badge */}
          <div className="flex items-center gap-4 my-2">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <StarIcon
                  key={i}
                  className={`w-5 h-5 ${
                    i < review.rating ? 'text-yellow-400' : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            {review.verifiedPurchase && (
              <div className="flex items-center gap-1 text-green-600">
                <CheckBadgeIcon className="w-5 h-5" />
                <span className="text-sm font-semibold">Verified Purchase</span>
              </div>
            )}
          </div>

          {/* Review Content */}
          <h3 className="text-lg font-semibold text-foreground mt-4">{review.title}</h3>
          <p className="text-foreground leading-relaxed mt-2">
            {review.content}
          </p>

          {/* Helpful Votes */}
          <div className="mt-4 text-sm text-muted-foreground">
            <span>{review.helpful} people found this helpful</span>
          </div>
        </div>
      </div>
    </div>
  );
}
