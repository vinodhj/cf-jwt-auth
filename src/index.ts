import { CfJwtAuthDataSource } from './datasources';
import { YogaSchemaDefinition, createYoga } from 'graphql-yoga';
import { drizzle } from 'drizzle-orm/d1';
import { schema } from './schemas';
import { verifyToken } from './resolvers/mutations/helper/jwtUtils';
import { GraphQLError } from 'graphql';
import { Role } from 'db/schema/user';
import { addCORSHeaders } from './cors-headers';

export interface Env {
  DB: D1Database;
  KV_CF_JWT_AUTH: KVNamespace;
  JWT_SECRET: string;
  PROJECT_TOKEN: string;
  KV_SYNC_TOKEN: string;
}

export interface YogaInitialContext {
  datasources: {
    cfJwtAuthDataSource: CfJwtAuthDataSource;
  };
  jwtSecret: string;
  accessToken: string;
  role: Role;
}

const GRAPHQL_PATH = '/graphql';

const getAccessToken = (authorizationHeader: string | null): string | null => {
  if (!authorizationHeader) return null;
  return authorizationHeader.replace(/bearer\s+/i, '').trim();
};

const validateProjectToken = (projectToken: string | null, expectedToken: string): void => {
  if (!projectToken || projectToken !== expectedToken) {
    throw new GraphQLError('Missing or invalid project token', {
      extensions: { code: 'UNAUTHORIZED' },
    });
  }
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const db = drizzle(env.DB);

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
      const yoga = createYoga({
        schema: schema as YogaSchemaDefinition<object, YogaInitialContext>,
        cors: {
          origin: '*',
          methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'PATCH', 'DELETE'],
          credentials: true,
          allowedHeaders: ['Content-Type', 'X-Project-Token', 'x-project-token', 'Authorization', 'authorization'],
        },
        landingPage: false,
        graphqlEndpoint: GRAPHQL_PATH,
        context: async () => {
          const projectToken = request.headers.get('X-Project-Token') ?? request.headers.get('x-project-token');
          const authorization = request.headers.get('Authorization') ?? request.headers.get('authorization');

          validateProjectToken(projectToken, env.PROJECT_TOKEN);

          const accessToken = getAccessToken(authorization);
          let role = Role.USER;
          if (accessToken) {
            try {
              const jwtVerifyToken = await verifyToken(accessToken, env.JWT_SECRET, env.KV_CF_JWT_AUTH);
              role = jwtVerifyToken.role;
            } catch (error) {
              const isGraphQLError = error instanceof GraphQLError;
              throw new GraphQLError(isGraphQLError ? error.message : 'Invalid token', {
                extensions: {
                  code: isGraphQLError ? error.extensions.code : 'UNAUTHORIZED',
                  // ...(isGraphQLError ? {} : { error }),
                  error: isGraphQLError && error.extensions?.error ? error.extensions.error : error,
                },
              });
            }
          }

          return {
            datasources: {
              cfJwtAuthDataSource: new CfJwtAuthDataSource({ db, role, jwtKV: env.KV_CF_JWT_AUTH }),
            },
            jwtSecret: env.JWT_SECRET,
            accessToken,
            role,
          };
        },
      });
      // ✅ Ensure CORS Headers Are Set on the Response
      const response = await yoga.fetch(request);
      return addCORSHeaders(response);
    }

    if (url.pathname === '/kv-site-assets' && request.method === 'POST') {
      const token = request.headers.get('Authorization');
      if (!token || token !== env.KV_SYNC_TOKEN) {
        return new Response('Unauthorized', { status: 401 });
      }

      try {
        const data: { kv_key: string; kv_value: string } = await request.json();
        if (!data) {
          return new Response('Missing data', { status: 400 });
        }

        const kv_key = data.kv_key;
        const kv_value = JSON.stringify(data.kv_value);

        await env.KV_CF_JWT_AUTH.put(kv_key, kv_value);
        const value = await env.KV_CF_JWT_AUTH.get(kv_key);
        if (value === null) {
          return new Response('Value not found', { status: 404 });
        }
        return new Response('KV config updated', { status: 200 });
      } catch (error) {
        return new Response(`Failed to sync : ${error}`, { status: 500 });
      }
    }

    return new Response('Not found', { status: 404 });
  },
} as ExportedHandler<Env>;
