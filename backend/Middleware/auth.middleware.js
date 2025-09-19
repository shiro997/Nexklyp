const jwt = require('jsonwebtoken');
class AuthMiddleware {
  constructor() { }
  authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Acceso denegado.' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) return res.status(403).json({ message: 'Token no válido.' });
      req.user = user;
      next();
    });
  };
}

module.exports = new AuthMiddleware();