
const successResponse = (res, statusCode, message, data = null) => {
  const response = {
    success: true,
    message
  };

  if (data) {
    response.data = data;
  }

  res.status(statusCode).json(response);
};

const errorResponse = (res, statusCode, message, errors = null) => {
  const response = {
    success: false,
    error: message
  };

  if (errors) {
    response.errors = errors;
  }

  res.status(statusCode).json(response);
};

const paginatedResponse = (res, statusCode, message, data, pagination) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      pages: Math.ceil(pagination.total / pagination.limit),
      hasNext: pagination.page < Math.ceil(pagination.total / pagination.limit),
      hasPrev: pagination.page > 1
    }
  });
};

module.exports = {
  successResponse,
  errorResponse,
  paginatedResponse
};
