import { Env } from '.';

// Helper to determine the proper CORS origin based on the request
export const getCorsOrigin = (request: Request, allowedOrigins: string[]): string | null => {
  const requestOrigin = request.headers.get('Origin');
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }
  return null;
};

export const addCORSHeaders = (request: Request, response: Response, env: Env): Response => {
  const allowedOrigins = env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',') : [];
  console.log('allowedOrigins', allowedOrigins);
  const newHeaders = new Headers(response.headers);
  const corsOrigin = getCorsOrigin(request, allowedOrigins);
  console.log('corsOrigin', corsOrigin);
  if (corsOrigin) {
    newHeaders.set('Access-Control-Allow-Origin', corsOrigin);
    // When using credentials, ensure the origin is explicitly set, not "*"
    newHeaders.set('Access-Control-Allow-Credentials', 'true');
  }
  newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  newHeaders.set('Access-Control-Allow-Headers', 'Content-Type, X-Project-Token, Authorization');

  // Adding Vary header to ensure caching mechanisms differentiate responses by origin
  newHeaders.append('Vary', 'Origin');

  console.log('Updated CORS headers:', Array.from(newHeaders.entries()));

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
};
