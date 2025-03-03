import { Env } from '.';

// Helper to determine the proper CORS origin based on the request
// export const getCorsOrigin = (request: Request, allowedOrigins: string[]): string | null => {
//   const requestOrigin = request.headers.get('Origin');
//   if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
//     return requestOrigin;
//   }
//   return null;
// };

// Helper to determine the proper CORS origin based on the request with subdomain matching
export const getCorsOrigin = (request: Request, allowedOrigins: string[]): string | null => {
  const requestOrigin = request.headers.get('Origin');
  if (!requestOrigin) {
    return null;
  }

  for (const allowed of allowedOrigins) {
    // If no wildcard is present, do an exact match.
    if (!allowed.includes('*')) {
      if (allowed === requestOrigin) {
        return requestOrigin;
      }
    } else {
      // Allowed origin contains a wildcard (e.g. "https://*.subdomain")
      // Convert the allowed pattern into a regular expression.
      const escaped = allowed.replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&');
      // Replace the escaped wildcard (\*) with a regex wildcard (.*)
      const pattern = '^' + escaped.replace(/\\\*/g, '.*') + '$';
      const regex = new RegExp(pattern, 'i'); // case-insensitive
      if (regex.test(requestOrigin)) {
        return requestOrigin;
      }
    }
  }
  return null;
};

export const addCORSHeaders = (request: Request, response: Response, env: Env): Response => {
  const allowedOrigins = env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()) : [];
  const newHeaders = new Headers(response.headers);
  const corsOrigin = getCorsOrigin(request, allowedOrigins);

  if (corsOrigin) {
    newHeaders.set('Access-Control-Allow-Origin', corsOrigin);
    // When using credentials, ensure the origin is explicitly set, not "*"
    newHeaders.set('Access-Control-Allow-Credentials', 'true');
  }
  newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  newHeaders.set(
    'Access-Control-Allow-Headers',
    'Content-Type, X-Project-Token, Authorization, apollographql-client-name, apollographql-client-version'
  );

  // Adding Vary header to ensure caching mechanisms differentiate responses by origin
  newHeaders.append('Vary', 'Origin');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
};
