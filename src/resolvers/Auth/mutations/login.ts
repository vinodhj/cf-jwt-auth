import { LoginInput } from 'generated';
import { GraphQLError } from 'graphql';
import { ApiType } from '@src/handlers/graphql';

export const login = async (_: unknown, { input }: { input: LoginInput }, { api }: { api: ApiType }) => {
  try {
    return await api.authAPI.login(input);
  } catch (error) {
    if (error instanceof GraphQLError || error instanceof Error) {
      // Re-throw GraphQL-specific errors
      throw error;
    }
    console.error('Unexpected error:', error);
    throw new GraphQLError('Failed to login', {
      extensions: {
        code: 'INTERNAL_SERVER_ERROR',
        error,
      },
    });
  }
};
