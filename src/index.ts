import handleKVSync from './handlers/kv-sync';
import handleGraphQL from './handlers/graphql';

export interface Env {
  DB: D1Database;
  KV_CF_JWT_AUTH: KVNamespace;
  JWT_SECRET: string;
  PROJECT_TOKEN: string;
  KV_SYNC_TOKEN: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // ✅ Handle CORS Preflight Requests (OPTIONS)
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, PATCH, DELETE',
          'Access-Control-Allow-Headers': 'Content-Type, X-Project-Token, Authorization',
          'Access-Control-Allow-Credentials': 'true',
        },
      });
    }

    if (url.pathname === '/graphql') {
      return handleGraphQL(request, env);
    }

    if (url.pathname === '/kv-site-assets' && request.method === 'POST') {
      return handleKVSync(request, env);
    }

    return new Response(
      /* HTML */ `
        <!DOCTYPE html>
        <html>
          <head>
            <title>404 Not Found</title>
          </head>
          <body>
            <h1>404 Not Found</h1>
            <p>Sorry, the page ${url.pathname !== '/' ? `(${url.pathname})` : ''} you are looking for could not be found.</p>
          </body>
        </html>
      `,
      {
        status: 404,
        headers: {
          'Content-Type': 'text/html',
        },
      }
    );
  },
} as ExportedHandler<Env>;
