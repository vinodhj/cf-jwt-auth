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
          async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
            const url = new URL(request.url);
            const db = drizzle(env.DB);
            if (url.pathname === '/graphql') {
              const yoga = createYoga({
                schema: schema as YogaSchemaDefinition<object, YogaInitialContext>,
                landingPage: false,
                graphqlEndpoint: GRAPHQL_PATH,
                context: async () => {
                  const projectToken = request.headers.get('X-Project-Token') ?? request.headers.get('x-project-token');
                  const authorization = request.headers.get('Authorization') ?? request.headers.get('authorization');

                  validateProjectToken(projectToken, env.PROJECT_TOKEN);

                  const accessToken = getAccessToken(authorization);
                  if (accessToken) {
                    try {
                      await verifyToken(accessToken, env.JWT_SECRET, env.KV_CF_JWT_AUTH);
                    } catch (error) {
                      const isGraphQLError = error instanceof GraphQLError;
                      throw new GraphQLError(isGraphQLError ? error.message : 'Invalid token', {
                        extensions: {
                          code: 'UNAUTHORIZED',
                          ...(isGraphQLError ? {} : { error }),
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
        } as ExportedHandler<Env>;
