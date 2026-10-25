/**
 * Centralized Account Ownership & Self-Interaction Rule (Backend)
 * 
 * Enforces server-side identity checks using immutable MongoDB ObjectIds.
 */

function normalizeId(entity) {
  if (!entity) return '';
  if (typeof entity === 'string') return entity.trim();
  if (typeof entity === 'object') {
    if (entity._id) return entity._id.toString().trim();
    if (entity.id) return entity.id.toString().trim();
    if (typeof entity.toString === 'function') {
      const str = entity.toString().trim();
      if (str !== '[object Object]') return str;
    }
  }
  return '';
}

function isSameUser(entityA, entityB) {
  const idA = normalizeId(entityA);
  const idB = normalizeId(entityB);
  if (!idA || !idB) return false;
  return idA === idB;
}

function isSelfAction(userId, targetId) {
  return isSameUser(userId, targetId);
}

module.exports = {
  normalizeId,
  isSameUser,
  isSelfAction,
};
