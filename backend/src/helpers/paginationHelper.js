const { PAGINATION } = require('../config/constants');

/**
 * Pagination Helper Functions
 */

/**
 * Get pagination parameters
 */
const getPaginationParams = (query) => {
  const page = parseInt(query.page) || PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(
    parseInt(query.limit) || PAGINATION.DEFAULT_LIMIT,
    PAGINATION.MAX_LIMIT
  );
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * Build pagination response
 */
const buildPaginationResponse = (data, total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage,
      hasPrevPage,
      nextPage: hasNextPage ? page + 1 : null,
      prevPage: hasPrevPage ? page - 1 : null
    }
  };
};

/**
 * Get sort parameters
 */
const getSortParams = (query) => {
  const sortBy = query.sortBy || 'createdAt';
  const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

  return { [sortBy]: sortOrder };
};

module.exports = {
  getPaginationParams,
  buildPaginationResponse,
  getSortParams
};
