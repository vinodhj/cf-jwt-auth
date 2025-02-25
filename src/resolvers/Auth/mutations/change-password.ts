import { ChangePasswordInput } from 'generated';
import { GraphQLError } from 'graphql';
import { ApiType } from '@src/handlers/graphql';

export const changePassword = async (
  _: unknown,
  { input }: { input: ChangePasswordInput },
  { api, accessToken }: { api: ApiType; accessToken: string | null }
): Promise<boolean> => {
  try {
    return await api.authAPI.changePassword(input, accessToken);
  } catch (error) {
    if (error instanceof GraphQLError) {
      // Re-throw GraphQL-specific errors
      throw error;
    }
    console.error('Unexpected error:', error);
    throw new GraphQLError('Failed to change password', {
      extensions: {
        code: 'INTERNAL_SERVER_ERROR',
        error,
      },
    });
  }
};
