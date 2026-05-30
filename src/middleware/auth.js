import jwt from 'jsonwebtoken';
import { PRODUCT_MAP, normalizeProductKey } from '../utils/index.js';

function parsePermissions(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getTokenProduct(decoded) {
  const productKey = normalizeProductKey(decoded?.product);
  if (PRODUCT_MAP[productKey]) return productKey;

  const permittedProducts = parsePermissions(decoded?.permissions)
    .map(normalizeProductKey)
    .filter((key) => PRODUCT_MAP[key]);

  return permittedProducts.length === 1 ? permittedProducts[0] : '';
}

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
console.log(token)
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error('JWT verify error:', err.message);
      return res.status(403).json({ message: 'Invalid token' });
    }
    const product = getTokenProduct(decoded);

    req.user = { ...decoded, product };
    req.permissions = parsePermissions(decoded.permissions);
    req.product = product;
    next();
  });
};
