import { CfJwtAuthDataSource } from '@src/datasources';
import { YogaSchemaDefinition, createYoga } from 'graphql-yoga';
import { drizzle } from 'drizzle-orm/d1';
import { schema } from '@src/schemas';
import { verifyToken } from '@src/resolvers/mutations/helper/jwtUtils';
import { GraphQLError } from 'graphql';
import { Role } from 'db/schema/user';
import { addCORSHeaders } from '@src/cors-headers';
import { Env } from '@src/index';

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

export default async function handleGraphQL(request: Request, env: Env): Promise<Response> {
  const db = drizzle(env.DB);
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
          console.error('Token verification failed:', error);
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
        accessToken,
        role,
      };
    },
  });
  // ✅ Ensure CORS Headers Are Set on the Response
  const response = await yoga.fetch(request);
  return addCORSHeaders(response);
}
