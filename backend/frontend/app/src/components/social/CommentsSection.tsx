import { useState, useEffect, type FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Send, Heart, Reply, MoreHorizontal, AtSign, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { socialService } from '@/lib/api';
import { cn } from '@/lib/utils';

export interface CommentItem {
  _id?: string;
  user?: string;
  userName?: string;
  userAvatar?: string;
  text: string;
  createdAt?: string | Date;
  likesCount?: number;
  replies?: CommentItem[];
}

interface CommentsSectionProps {
  serviceId: string;
  initialCommentsCount?: number;
  onCommentsCountChange?: (count: number) => void;
  className?: string;
}

export function CommentsSection({
  serviceId,
  initialCommentsCount = 0,
  onCommentsCountChange,
  className,
}: CommentsSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<'latest' | 'popular'>('latest');
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  // Fetch comments from backend
  const fetchComments = async (sort = sortOrder) => {
    try {
      setIsLoading(true);
      const res = await socialService.getComments(serviceId, sort);
      const fetched = res.data?.data?.comments || [];
      setComments(fetched);
      if (onCommentsCountChange) {
        onCommentsCountChange(res.data?.data?.commentsCount ?? fetched.length);
      }
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComments(sortOrder);
  }, [serviceId, sortOrder]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Please log in to comment');
      return;
    }

    if (!commentText.trim()) return;

    try {
      setIsSubmitting(true);
      const textToSend = replyingTo ? `@${replyingTo} ${commentText.trim()}` : commentText.trim();
      const res = await socialService.addComment(serviceId, textToSend);
      const newComment = res.data?.data?.comment;

      if (newComment) {
        const updated = [newComment, ...comments];
        setComments(updated);
        if (onCommentsCountChange) {
          onCommentsCountChange(res.data?.data?.commentsCount ?? updated.length);
        }
      }

      setCommentText('');
      setReplyingTo(null);
      toast.success('Comment posted');
    } catch (err: any) {
      console.error('Error submitting comment:', err);
      toast.error(err.response?.data?.message || 'Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInsertMention = () => {
    setCommentText((prev) => (prev ? `${prev} @` : '@'));
  };

  // Helper function to format relative timestamp
  const formatTimestamp = (dateInput?: string | Date) => {
    if (!dateInput) return 'Just now';
    const date = new Date(dateInput);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  // Render text highlighting user @mentions in purple (#9747FF)
  const renderFormattedText = (text: string) => {
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        return (
          <span key={index} className="text-[#9747FF] font-semibold">
            {part}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const totalCount = comments.length > 0 ? comments.length : initialCommentsCount;

  return (
    <div className={cn('bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 mt-3', className)}>
      {/* Header with Comments Badge and Latest / Popular Sort - Matches Reference Image 2 */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
        <div className="flex items-center gap-2">
          <h4 className="text-base font-bold text-gray-900 tracking-tight">Comments</h4>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-[#9747FF]">
            {totalCount}
          </span>
        </div>

        {/* Sort Toggle: Latest | Popular */}
        <div className="flex items-center rounded-lg bg-gray-100 p-0.5 text-xs font-medium text-gray-600">
          <button
            type="button"
            onClick={() => setSortOrder('latest')}
            className={cn(
              'px-2.5 py-1 rounded-md transition-all cursor-pointer',
              sortOrder === 'latest'
                ? 'bg-white text-gray-900 shadow-xs font-semibold'
                : 'hover:text-gray-900'
            )}
          >
            Latest
          </button>
          <button
            type="button"
            onClick={() => setSortOrder('popular')}
            className={cn(
              'px-2.5 py-1 rounded-md transition-all cursor-pointer',
              sortOrder === 'popular'
                ? 'bg-white text-gray-900 shadow-xs font-semibold'
                : 'hover:text-gray-900'
            )}
          >
            Popular
          </button>
        </div>
      </div>

      {/* Comment Composer - Matches Reference Image 2 */}
      <form onSubmit={handleSubmit} className="mb-5">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-purple-100 text-[#9747FF] flex items-center justify-center shrink-0 font-bold text-xs border border-purple-200">
            {user?.avatar ? (
              <img src={user.avatar} alt="User" className="w-full h-full object-cover" />
            ) : (
              user?.firstName?.[0] || 'U'
            )}
          </div>

          <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-2.5 transition-all focus-within:border-[#9747FF]/60 focus-within:bg-white focus-within:shadow-xs">
            {replyingTo && (
              <div className="flex items-center justify-between text-xs text-[#9747FF] font-medium mb-1.5 pb-1 border-b border-gray-100">
                <span>Replying to @{replyingTo}</span>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            )}

            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a comment..."
              rows={2}
              className="w-full resize-none border-none bg-transparent text-xs sm:text-sm text-gray-800 placeholder-gray-400 focus:outline-none p-0"
            />

            <div className="flex items-center justify-between pt-2 border-t border-gray-100/80 mt-1.5">
              <button
                type="button"
                onClick={handleInsertMention}
                className="text-gray-400 hover:text-[#9747FF] p-1 rounded-md transition-colors"
                title="Mention someone"
              >
                <AtSign className="w-4 h-4" />
              </button>

              <Button
                type="submit"
                disabled={isSubmitting || !commentText.trim()}
                className="bg-[#9747FF] hover:bg-[#8534f0] text-white rounded-lg px-3.5 py-1.5 text-xs font-semibold h-auto shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 mr-1" />
                    <span>Send</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>

      {/* Comments List - Matches Reference Image 2 */}
      {isLoading ? (
        <div className="py-6 flex items-center justify-center text-gray-400 gap-2 text-xs">
          <Loader2 className="w-4 h-4 animate-spin text-[#9747FF]" />
          <span>Loading comments...</span>
        </div>
      ) : comments.length === 0 ? (
        <div className="py-6 text-center text-xs text-gray-400">
          No comments yet. Be the first to share your thoughts!
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment, index) => (
            <div key={comment._id || index} className="flex items-start gap-3 group">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center shrink-0 border border-gray-200">
                {comment.userAvatar ? (
                  <img
                    src={comment.userAvatar}
                    alt={comment.userName || 'Author'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-gray-500 font-bold text-xs">
                    {(comment.userName || 'U')[0].toUpperCase()}
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-gray-900">
                      {comment.userName || 'Creator Community Member'}
                    </span>
                    <span className="text-[11px] text-gray-400 font-normal">
                      {formatTimestamp(comment.createdAt)}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="text-gray-300 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                    title="Options"
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-xs sm:text-sm text-gray-700 mt-1 leading-relaxed break-words">
                  {renderFormattedText(comment.text)}
                </p>

                {/* Comment Action Row: Reply & Reaction */}
                <div className="flex items-center gap-4 mt-2">
                  <button
                    type="button"
                    onClick={() => setReplyingTo(comment.userName || 'member')}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 hover:text-[#9747FF] transition-colors"
                  >
                    <Reply className="w-3 h-3" />
                    <span>Reply</span>
                  </button>

                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Heart className="w-3 h-3" />
                    <span>{comment.likesCount || 0}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
