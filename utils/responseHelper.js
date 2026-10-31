// utils/responseHelper.js
export const errorResponse = (res, statusCode, message, additionalData = null) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    const response = {
        status: false,
        response: message,
        data: null
    };

    // Add additional error data if provided (for development/debugging)
    if (additionalData && process.env.NODE_ENV !== 'production') {
        response.error = additionalData;
    }

    return res.status(statusCode).json(response);
};

export const successResponse = (res, statusCode, data, message = "Success") => {
    return res.status(statusCode).json({
        status: true,
        response: message,
        data
    });
};
   
// Additional helper for paginated responses
export const paginatedResponse = (res, statusCode, data, pagination, message = "Success") => {
    return res.status(statusCode).json({
        status: true,
        response: message,
        data,
        pagination: {
            page: pagination.page,
            limit: pagination.limit,
            total: pagination.total,
            totalPages: Math.ceil(pagination.total / pagination.limit),
            hasNext: pagination.page < Math.ceil(pagination.total / pagination.limit),
            hasPrev: pagination.page > 1
        }
    });
};

// Helper for validation errors (works with express-validator)
export const validationErrorResponse = (res, errors) => {
    const validationErrors = errors.array().map(error => ({
        field: error.path || error.param,
        message: error.msg,
        value: error.value
    }));

    return errorResponse(res, 400, 'Validation failed', { errors: validationErrors });
};