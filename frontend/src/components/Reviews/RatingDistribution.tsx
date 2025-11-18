import { StarIcon } from '@heroicons/react/24/solid';
import { Review } from '../../mocks/reviewData';

interface RatingDistributionProps {
  reviews: Review[];
}

export default function RatingDistribution({ reviews }: RatingDistributionProps) {
  if (!reviews || reviews.length === 0) {
    return <p>No reviews yet.</p>;
  }

  const totalReviews = reviews.length;
  const averageRating = reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews;

  const ratingCounts = {
    5: 0,
    4: 0,
    3: 0,
    2: 0,
    1: 0,
  };

  // Tally the number of reviews for each star rating
  for (const review of reviews) {
    ratingCounts[review.rating]++;
  }

  return (
    <div className="p-6 bg-muted rounded-lg">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Overall Rating */}
        <div className="flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-border pb-6 md:pb-0 md:pr-6">
          <p className="text-sm text-muted-foreground mb-2">Overall Rating</p>
          <p className="text-5xl font-bold text-foreground mb-2">
            {averageRating.toFixed(1)}
          </p>
          <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
              <StarIcon
                key={i}
                className={`w-6 h-6 ${
                  i < Math.round(averageRating) ? 'text-yellow-400' : 'text-gray-300'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-3">{totalReviews} reviews</p>
        </div>

        {/* Rating Bars */}
        <div className="md:col-span-2">
          <p className="text-lg font-semibold text-foreground mb-4">Rating Distribution</p>
          <div className="space-y-2">
            {Object.entries(ratingCounts)
              .sort(([a], [b]) => Number(b) - Number(a)) // Sort from 5 stars to 1
              .map(([stars, count]) => {
                const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                return (
                  <div key={stars} className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">{stars} stars</span>
                    <div className="flex-1 bg-border rounded-full h-3">
                      <div
                        className="bg-yellow-400 h-3 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="w-12 text-right text-muted-foreground">{count}</span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
