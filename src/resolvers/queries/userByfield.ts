import { CfJwtAuthDataSource } from '@src/datasources';
import { Role } from 'db/schema/user';
import { UserByFieldInput } from 'generated';
import { GraphQLError } from 'graphql';
import { validateUserAccess } from '../mutations/helper/userAccessValidators';

export const userByfield = (
  _: unknown,
  { input }: { input: UserByFieldInput },
  { datasources, accessToken, role }: { datasources: { cfJwtAuthDataSource: CfJwtAuthDataSource }; accessToken: string | null; role: Role }
) => {
  try {
    validateUserAccess(accessToken, role);
    return null;
    //return datasources.cfJwtAuthDataSource.userByEmail(input);
  } catch (error) {
    if (error instanceof GraphQLError) {
      // Re-throw GraphQL-specific errors
      throw error;
    }
    console.error('Unexpected error:', error);
    throw new GraphQLError('Failed to get user by field', {
      extensions: {
        code: 'INTERNAL_SERVER_ERROR',
        error,
      },
    });
  }
};
