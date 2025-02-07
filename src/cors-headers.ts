/**
 * Adds CORS headers to a Response object.
 *
 *
 */

export const addCORSHeaders = (response: Response): Response => {
  const newHeaders = new Headers(response.headers);
  newHeaders.set('Access-Control-Allow-Origin', '*');
  newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  newHeaders.set('Access-Control-Allow-Headers', 'Content-Type, X-Project-Token, Authorization');
  newHeaders.set('Access-Control-Allow-Credentials', 'true');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
};
