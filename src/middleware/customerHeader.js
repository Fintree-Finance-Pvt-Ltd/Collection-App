import jwt from "jsonwebtoken";

export const customerMiddleware = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).json({ error: "Authorization header is required" });
  }

  const token = authHeader.split(" ")[1];

  // console.log("TOKEN:", token);
  // console.log("SECRET:", process.env.JWT_SECRET);
  // console.log("LOGIN TOKEN:", token);
  // console.log("SEGMENTS:", token.split(".").length);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("DECODED:", decoded);

    req.customerId = decoded.customerId;
    req.lanId = decoded.lanId;
    req.product = decoded.product;
    req.user = decoded;

    next();
  } catch (err) {
    console.error("JWT ERROR:", err.message);
    return res.status(403).json({ error: "Invalid token" });
  }
};

export default customerMiddleware;
