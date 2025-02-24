import { CfJwtAuthDataSource, SessionUserType } from '@src/datasources';
import { GraphQLError } from 'graphql';
import { validateUserAccess } from '../mutations/helper/userAccessValidators';

export const users = (
  _: unknown,
  __: unknown,
  {
    datasources: { cfJwtAuthDataSource },
    accessToken,
    sessionUser,
  }: { datasources: { cfJwtAuthDataSource: CfJwtAuthDataSource }; accessToken: string | null; sessionUser: SessionUserType }
) => {
  try {
    validateUserAccess(accessToken, sessionUser, {});
    return cfJwtAuthDataSource.getUserAPI().users();
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
