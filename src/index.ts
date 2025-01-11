import { CfJwtAuthDataSource } from './datasources';
import { YogaSchemaDefinition, createYoga } from 'graphql-yoga';
import { drizzle } from 'drizzle-orm/d1';
import { schema } from './schemas';
import { verifyToken } from './resolvers/mutations/helper/jwtUtils';

export interface Env {
  DB: D1Database;
  KV_CF_JWT_AUTH: KVNamespace;
  JWT_SECRET: string;
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
        context: () => {
          const authorization = request.headers.get('Authorization') || request.headers.get('authorization');
          let accessToken: string | null = null;
          if (authorization) {
            // check for auth
            accessToken = authorization.replace(/bearer /i, '').replace(/Bearer /i, '');
            verifyToken(accessToken, env.JWT_SECRET);
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
