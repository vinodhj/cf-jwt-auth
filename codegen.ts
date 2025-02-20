import type { CodegenConfig } from '@graphql-codegen/cli';
import dotenv from 'dotenv';
dotenv.config();

const config: CodegenConfig = {
  schema: {
    ['http://localhost:7787/graphql']: {
      headers: {
        'X-Project-Token': process.env.PROJECT_TOKEN || '',
        'x-allow-arbitrary-operations': 'true',
      },
    },
  },
  generates: {
    'generated.ts': {
      plugins: ['typescript', 'typescript-resolvers'],
    },
  },
};
export default config;
