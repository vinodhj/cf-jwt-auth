import { ApolloServer } from '@apollo/server';
import { startServerAndCreateCloudflareWorkersHandler } from '@as-integrations/cloudflare-workers';
import { drizzle } from 'drizzle-orm/d1';
import { schema } from './schemas';
import { verifyToken } from './resolvers/mutations/helper/jwtUtils';
import { Role } from 'db/schema/user';
import { CfJwtAuthDataSource } from './datasources';
import { addCORSHeaders } from './cors-headers';
import { GraphQLError } from 'graphql';

export interface Env {
  DB: D1Database;
  KV_CF_JWT_AUTH: KVNamespace;
  JWT_SECRET: string;
  PROJECT_TOKEN: string;
}

export interface ApolloInitialContext {
  datasources: {
    cfJwtAuthDataSource: CfJwtAuthDataSource;
  };
  jwtSecret: string;
  accessToken: string;
  role: Role;
}

const getAccessToken = (authorizationHeader: string | null): string | null =>
  authorizationHeader ? authorizationHeader.replace(/bearer\s+/i, '').trim() : null;

const validateProjectToken = (projectToken: string | null, expectedToken: string): void => {
  if (!projectToken || projectToken !== expectedToken) {
    throw new GraphQLError('Missing or invalid project token', {
      extensions: { code: 'UNAUTHORIZED' },
    });
  }
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, PATCH, DELETE',
  'Access-Control-Allow-Headers': 'Content-Type, X-Project-Token, Authorization',
  'Access-Control-Allow-Credentials': 'true',
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Only handle requests to the /graphql endpoint
    if (url.pathname !== '/graphql') {
      return new Response('Not found', { status: 404 });
    }

    const db = drizzle(env.DB);

    // Create Apollo Server without a context property here
    const server = new ApolloServer({
      schema,
    });

    // Pass the context function as an option to the integration helper
    const handler = startServerAndCreateCloudflareWorkersHandler(server, {
      context: async ({ request }: { request: Request }): Promise<ApolloInitialContext> => {
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
          accessToken: accessToken ?? '',
          role,
        };
      },
    });

    const response = await handler(request, env, ctx);
    return addCORSHeaders(response);
  },
} as ExportedHandler<Env>;
