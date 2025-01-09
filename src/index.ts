import { CfJwtAuthDataSource } from './datasources';
import { YogaSchemaDefinition, createYoga } from 'graphql-yoga';
import { drizzle } from 'drizzle-orm/d1';
import { schema } from './schemas';

export interface Env {
  DB: D1Database;
  KV_CF_JWT_AUTH: KVNamespace;
  ENVIRONMENT: string;
}

export interface YogaInitialContext {
  datasources: {
    cfJwtAuthDataSource: CfJwtAuthDataSource;
  };
  environment: string;
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    const db = drizzle(env.DB);
    const datasources = {
      cfJwtAuthDataSource: new CfJwtAuthDataSource({ db }),
    };

    if (url.pathname === '/graphql') {
      const yoga = createYoga({
        schema: schema as YogaSchemaDefinition<object, YogaInitialContext>,
        landingPage: false,
        graphqlEndpoint: '/graphql',
        context: () => ({
          datasources: {
            cfJwtAuthDataSource: new CfJwtAuthDataSource({ db }),
          },
          environment: env.ENVIRONMENT,
        }),
      });
      return yoga.fetch(request);
    }
    return new Response('Not found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;