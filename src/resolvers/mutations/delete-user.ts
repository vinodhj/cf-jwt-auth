import { CfJwtAuthDataSource } from '@src/datasources';
import { DeleteUserInput } from 'generated';
import { GraphQLError } from 'graphql';
import { Role } from 'db/schema/user';
import { validateUserAccess } from './helper/userAccessValidators';
import { defineAbilitiesFor } from '@src/handlers/abilities';
import { subject } from '@casl/ability';

export const deleteUser = async (
  _: unknown,
  { input }: { input: DeleteUserInput },
  {
    datasources,
    accessToken,
    role,
    user,
    ability,
  }: {
    datasources: { cfJwtAuthDataSource: CfJwtAuthDataSource };
    accessToken: string | null;
    role: Role;
    user: { id: string; role: Role; email: string };
    ability: ReturnType<typeof defineAbilitiesFor>;
  }
) => {
  try {
    if (!ability.can('delete', subject('User', { id: input.id }))) {
      throw new GraphQLError('Access denied: You do not have permission to delete this user', {
        extensions: { code: 'UNAUTHORIZED' },
      });
    }
    // Delete user
    return await datasources.cfJwtAuthDataSource.deleteUser(input);
  } catch (error) {
    if (error instanceof GraphQLError) {
      // Re-throw GraphQL-specific errors
      throw error;
    }
    console.error('Unexpected error:', error);
    throw new GraphQLError('Failed to delete user', {
      extensions: {
        code: 'INTERNAL_SERVER_ERROR',
        error,
      },
    });
  }
};
