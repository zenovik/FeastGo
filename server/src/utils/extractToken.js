export function extractToken(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7);
  if (req.cookies?.feastgo_token) return req.cookies.feastgo_token;
  return null;
}
