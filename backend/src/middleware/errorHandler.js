function notFoundHandler(req, res) {
    res.status(404).json({
        message: `Route not found: ${req.method} ${req.originalUrl}`,
    });
}

function errorHandler(err, req, res, _next) {
    console.error(err);

    res.status(500).json({
        message: 'Internal server error',
    });
}

module.exports = {
    notFoundHandler,
    errorHandler,
};