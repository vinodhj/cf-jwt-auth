import { CfJwtAuthDataSource } from '@src/datasources';
import { AdminKvAssetInput } from 'generated';
import { GraphQLError } from 'graphql';

export const adminKvAsset = (
  _: unknown,
  { input }: { input: AdminKvAssetInput },
  { datasources, accessToken }: { datasources: { cfJwtAuthDataSource: CfJwtAuthDataSource }; accessToken: string | null }
) => {
  try {
    if (!accessToken) {
      throw new GraphQLError('Not authenticated', {
        extensions: { code: 'UNAUTHORIZED' },
      });
    }
    return datasources.cfJwtAuthDataSource.adminKvAsset(input);
  } catch (error) {
    if (error instanceof GraphQLError) {
      // Re-throw GraphQL-specific errors
      throw error;
    }
    console.error('Unexpected error:', error);
    throw new GraphQLError('Failed to get admin kv asset', {
      extensions: {
        code: 'INTERNAL_SERVER_ERROR',
        error,
      },
    });
  }
};
