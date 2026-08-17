// Envuelve un handler async de Express para que las promesas rechazadas
// lleguen al middleware de errores en vez de colgar la petición.
module.exports = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
