import { CfJwtAuthDataSource } from './datasources';
import { YogaSchemaDefinition, createYoga } from 'graphql-yoga';
import { drizzle } from 'drizzle-orm/d1';
import { schema } from './schemas';
import { verifyToken } from './resolvers/mutations/helper/jwtUtils';
import { GraphQLError } from 'graphql';

export interface Env {
  DB: D1Database;
  KV_CF_JWT_AUTH: KVNamespace;
  JWT_SECRET: string;
  PROJECT_TOKEN: string;
}

export interface YogaInitialContext {
  datasources: {
    cfJwtAuthDataSource: CfJwtAuthDataSource;
  };
  jwtSecret: string;
  accessToken: string | null;
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    const db = drizzle(env.DB);
    if (url.pathname === '/graphql') {
      const yoga = createYoga({
        schema: schema as YogaSchemaDefinition<object, YogaInitialContext>,
        landingPage: false,
        graphqlEndpoint: '/graphql',
        context: async () => {
          const projectToken = request.headers.get('X-Project-Token') ?? request.headers.get('x-project-token');
          const authorization = request.headers.get('Authorization') ?? request.headers.get('authorization');

          if (!projectToken || projectToken !== env.PROJECT_TOKEN) {
            throw new GraphQLError('Missing or invalid project token', {
              extensions: {
                code: 'UNAUTHORIZED',
              },
            });
          }

          let accessToken: string | null = null;
          if (authorization) {
            accessToken = authorization.replace(/bearer /i, '').replace(/Bearer /i, '');
            try {
              await verifyToken(accessToken, env.JWT_SECRET, env.KV_CF_JWT_AUTH);
            } catch (error) {
              accessToken = null;
              if (error instanceof GraphQLError || error instanceof Error) {
                // Re-throw GraphQL-specific errors
                throw error;
              }
              throw new GraphQLError('Invalid token', {
                extensions: {
                  code: 'UNAUTHORIZED',
                  error,
                },
              });
            }
          }

          return {
            datasources: {
              cfJwtAuthDataSource: new CfJwtAuthDataSource({ db }),
            },
            jwtSecret: env.JWT_SECRET,
            accessToken,
          };
        },
      });
      return yoga.fetch(request);
    }
    return new Response('Not found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
