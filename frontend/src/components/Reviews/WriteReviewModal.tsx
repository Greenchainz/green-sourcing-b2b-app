import { useState } from 'react';
import { StarIcon } from '@heroicons/react/24/solid';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface WriteReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemName: string;
}

// Mock user data as per instructions
const MOCK_USER = {
  name: 'Alex Johnson',
  company: 'BuildRight Contractors',
};

export default function WriteReviewModal({ isOpen, onClose, itemName }: WriteReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [recommend, setRecommend] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      alert('Please select a star rating.');
      return;
    }
    // Mock action: log data to console
    console.log({
      user: MOCK_USER,
      itemName,
      rating,
      title,
      content,
      recommend,
    });
    onClose(); // Close modal on submit
    // Reset form state for next time
    setRating(0);
    setTitle('');
    setContent('');
    setRecommend(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg p-8 max-w-lg w-full relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>

        <h2 className="text-2xl font-bold text-foreground mb-2">Write a Review</h2>
        <p className="text-muted-foreground mb-6">For: {itemName}</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Star Rating Input */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Your Rating*</label>
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => {
                const starValue = i + 1;
                return (
                  <button
                    type="button"
                    key={starValue}
                    onClick={() => setRating(starValue)}
                    onMouseEnter={() => setHoverRating(starValue)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="focus:outline-none"
                  >
                    <StarIcon
                      className={`w-8 h-8 transition-colors ${
                        starValue <= (hoverRating || rating)
                          ? 'text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title Input */}
          <div>
            <label htmlFor="review-title" className="block text-sm font-medium text-foreground">
              Review Title
            </label>
            <input
              id="review-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Great insulation material!"
              className="mt-1 w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
            />
          </div>

          {/* Review Content */}
          <div>
            <label htmlFor="review-content" className="block text-sm font-medium text-foreground">
              Your Review
            </label>
            <textarea
              id="review-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Tell us about your experience..."
              rows={5}
              maxLength={500}
              className="mt-1 w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
            />
            <p className="text-xs text-muted-foreground text-right">{500 - content.length} characters remaining</p>
          </div>

          {/* Would Recommend */}
          <div>
             <label className="block text-sm font-medium text-foreground mb-2">Would you recommend this product?</label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setRecommend(true)}
                className={`px-6 py-2 rounded-full text-sm font-semibold transition-colors ${
                  recommend ? 'bg-primary text-white' : 'bg-muted hover:bg-border'
                }`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setRecommend(false)}
                className={`px-6 py-2 rounded-full text-sm font-semibold transition-colors ${
                  !recommend ? 'bg-primary text-white' : 'bg-muted hover:bg-border'
                }`}
              >
                No
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-border text-foreground font-semibold rounded-lg hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover transition-colors"
            >
              Submit Review
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
