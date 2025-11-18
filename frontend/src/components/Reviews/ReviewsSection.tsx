import { useState, useMemo } from 'react';
import { mockReviews, Review } from '../../mocks/reviewData';
import RatingDistribution from './RatingDistribution';
import ReviewCard from './ReviewCard';
import WriteReviewModal from './WriteReviewModal';

interface ReviewsSectionProps {
  itemId: number;
  itemType: 'product' | 'supplier';
  itemName: string;
}

// NOTE FOR LATER (Phase 2 Features):
// 1. Verify Purchase: Before allowing a review, cross-reference the user's purchase history.
// 2. Report Abuse: Add a "report" button to each review card for community moderation.
// 3. Supplier Response: Add functionality for suppliers to publicly reply to reviews.
// 4. API Integration: Replace mockReviews with a Supabase query to fetch reviews.

export default function ReviewsSection({ itemId, itemType, itemName }: ReviewsSectionProps) {
  const [isModalOpen, setModalOpen] = useState(false);

  // Filter and sort reviews based on the current item (product or supplier)
  const relevantReviews = useMemo(() => {
    return mockReviews
      .filter((review) => {
        const key = itemType === 'product' ? 'productId' : 'supplierId';
        return review[key] === itemId;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Newest first
  }, [itemId, itemType]);

  return (
    <div className="max-w-7xl mx-auto py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h2 className="text-3xl font-bold text-foreground mb-4 md:mb-0">
          Ratings & Reviews for {itemName}
        </h2>
        <button
          onClick={() => setModalOpen(true)}
          className="px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover transition-colors whitespace-nowrap"
        >
          Write a Review
        </button>
      </div>

      {/* Rating Summary */}
      {relevantReviews.length > 0 ? (
         <RatingDistribution reviews={relevantReviews} />
      ) : (
        <div className="text-center py-12 bg-muted rounded-lg">
            <h3 className="text-xl font-semibold text-foreground">No Reviews Yet</h3>
            <p className="text-muted-foreground mt-2">Be the first to share your feedback!</p>
        </div>
      )}


      {/* Individual Reviews List */}
      <div className="mt-8">
        {relevantReviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>

      {/* Write Review Modal */}
      <WriteReviewModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        itemName={itemName}
      />
    </div>
  );
}
