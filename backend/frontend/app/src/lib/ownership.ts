/**
 * Centralized Account Ownership & Self-Interaction Authority
 * 
 * Single authoritative source of truth for comparing user/creator identities
 * and preventing invalid self-directed interactions (messaging yourself,
 * booking yourself, favoriting yourself, or viewing your own profile as an external creator).
 */

export type EntityWithId = 
  | string 
  | { id?: string | null; _id?: string | null; [key: string]: any } 
  | null 
  | undefined;

/**
 * Safely extracts a normalized string ID from a user, creator, or raw identifier.
 */
export function normalizeEntityId(entity: EntityWithId): string {
  if (!entity) return '';
  if (typeof entity === 'string') return entity.trim();
  if (typeof entity === 'object') {
    if (entity._id) return String(entity._id).trim();
    if (entity.id) return String(entity.id).trim();
  }
  return '';
}

/**
 * Determines whether two user/creator entities represent the same account.
 * Uses immutable database IDs, never display names, usernames, or emails.
 */
export function isSameAccount(entityA: EntityWithId, entityB: EntityWithId): boolean {
  const idA = normalizeEntityId(entityA);
  const idB = normalizeEntityId(entityB);
  if (!idA || !idB) return false;
  return idA === idB;
}

/**
 * Determines whether an action targeted at `targetEntity` is a self-interaction
 * by the currently authenticated user `currentUser`.
 */
export function isSelfAction(currentUser: EntityWithId, targetEntity: EntityWithId): boolean {
  return isSameAccount(currentUser, targetEntity);
}

/**
 * Evaluates available creator profile interaction permissions.
 */
export function getCreatorInteractionPermissions(currentUser: EntityWithId, creator: EntityWithId) {
  const isSelf = isSameAccount(currentUser, creator);
  return {
    isSelf,
    canBook: !isSelf,
    canMessage: !isSelf,
    canFavorite: !isSelf,
    canReview: !isSelf,
  };
}

/**
 * Determines if the current authenticated user owns a post/service.
 */
export function isPostAuthor(currentUser: EntityWithId, post: { creator?: EntityWithId; author?: EntityWithId; user?: EntityWithId; [key: string]: any } | null | undefined): boolean {
  if (!currentUser || !post) return false;
  const creatorTarget = post.creator || post.author || post.user;
  return isSameAccount(currentUser, creatorTarget);
}
