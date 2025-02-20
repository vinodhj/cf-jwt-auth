import { Role } from 'db/schema/user';
import { GraphQLError } from 'graphql';

export const validateUserAccess = (accessToken: string | null, role: Role): void => {
  if (!accessToken) {
    throw new GraphQLError('Unauthorized token', {
      extensions: {
        code: 'UNAUTHORIZED',
      },
    });
  }

  if (role !== Role.ADMIN) {
    throw new GraphQLError('Your Role not authorized to perform this action', {
      extensions: {
        code: 'UNAUTHORIZED_ROLE',
      },
    });
  }
};
