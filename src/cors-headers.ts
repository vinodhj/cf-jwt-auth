/**
 * Adds CORS headers to a Response object.
 *
 *
 */

// Allowed origins should be only origins (protocol + host + port)
export const allowedOrigins = ['http://localhost:1878', 'https://react-mui-admin.pages.dev'];

// Helper to determine the proper CORS origin based on the request
export const getCorsOrigin = (request: Request): string => {
  const requestOrigin = request.headers.get('Origin');
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }
  return allowedOrigins[1];
};

export const addCORSHeaders = (request: Request, response: Response): Response => {
  const newHeaders = new Headers(response.headers);
  const corsOrigin = getCorsOrigin(request);

  newHeaders.set('Access-Control-Allow-Origin', corsOrigin);
  newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  newHeaders.set('Access-Control-Allow-Headers', 'Content-Type, X-Project-Token, Authorization');
  newHeaders.set('Access-Control-Allow-Credentials', 'true');

  console.log('Updated CORS headers:', Array.from(newHeaders.entries()));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
};
