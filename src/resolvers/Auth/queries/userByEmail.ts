import { CfJwtAuthDataSource, SessionUserType } from '@src/datasources';
import { UserByEmailInput } from 'generated';
import { GraphQLError } from 'graphql';
import { validateUserAccess } from '../mutations/helper/userAccessValidators';

export const userByEmail = async (
  _: unknown,
  { input }: { input: UserByEmailInput },
  {
    datasources: { cfJwtAuthDataSource },
    accessToken,
    sessionUser,
  }: { datasources: { cfJwtAuthDataSource: CfJwtAuthDataSource }; accessToken: string | null; sessionUser: SessionUserType }
) => {
  try {
    validateUserAccess(accessToken, sessionUser, { email: input.email });
    const result = await cfJwtAuthDataSource.getUserAPI().userByEmail(input);
    if (!result) {
      throw new GraphQLError('User not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }
    return result;
  } catch (error) {
    if (error instanceof GraphQLError) {
      // Re-throw GraphQL-specific errors
      throw error;
    }
    console.error('Unexpected error:', error);
    throw new GraphQLError('Failed to get user', {
      extensions: {
        code: 'INTERNAL_SERVER_ERROR',
        error,
      },
    });
  }
};
