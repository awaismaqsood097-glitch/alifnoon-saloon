const jwt = require('jsonwebtoken');

/**
 * Auth Middleware
 * ────────────────────────────────────────────────
 * Admin-only routes ko protect karta hai.
 *
 * Request mein 'Authorization' header se JWT token
 * nikalta hai (format: "Bearer <token>").
 *
 * Token verify hone par: req.admin set hota hai
 * Token invalid/missing: 401 error return hota hai
 * ────────────────────────────────────────────────
 */
module.exports = function (req, res, next) {
  /* Step 1: Authorization header nikalo */
  const authHeader = req.header('Authorization');

  /* Step 2: "Bearer " prefix hatao */
  const token =
    authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

  /* Step 3: Token nahi mila → 401 */
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No token, authorization denied'
    });
  }

  /* Step 4: Token verify karo */
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded; // { id, username, iat, exp }
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Token is not valid or expired'
    });
  }
};