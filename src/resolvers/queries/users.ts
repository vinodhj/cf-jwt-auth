import { CfJwtAuthDataSource } from '@src/datasources';
import { Role } from 'db/schema/user';
import { GraphQLError } from 'graphql';
import { validateUserAccess } from '../mutations/helper/userAccessValidators';

export const users = (
  _: unknown,
  __: unknown,
  { datasources, accessToken, role }: { datasources: { cfJwtAuthDataSource: CfJwtAuthDataSource }; accessToken: string | null; role: Role }
) => {
  try {
    validateUserAccess(accessToken, role);
    return datasources.cfJwtAuthDataSource.users();
  } catch (error) {
    if (error instanceof GraphQLError) {
      // Re-throw GraphQL-specific errors
      throw error;
    }
    console.error('Unexpected error:', error);
    throw new GraphQLError('Failed to get users', {
      extensions: {
        code: 'INTERNAL_SERVER_ERROR',
        error,
      },
    });
  }
};
