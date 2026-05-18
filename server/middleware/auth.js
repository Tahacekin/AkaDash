const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');
const { getUser } = require('../store/userStore');

function signToken(user) {
  return jwt.sign(
    { sub: user.sub, email: user.email, name: user.displayName },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.auth = {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
    };
    req.userRecord = getUser(payload.sub);
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

module.exports = {
  signToken,
  requireAuth,
};
