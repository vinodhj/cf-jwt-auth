import { rule, shield, and, or } from 'graphql-shield';
import { Role } from 'db/schema/user';
import { YogaInitialContext } from './graphql';
import { GraphQLError } from 'graphql';
import { verifyToken } from '@src/resolvers/mutations/helper/jwtUtils';

const isProjectToken = rule({ cache: 'contextual' })((_parent, _args, ctx: YogaInitialContext) => {
  return ctx.projectToken !== null;
});

// Authentication: Ensure user is logged in
const isAuthenticated = rule({ cache: 'contextual' })((_parent, _args, ctx: YogaInitialContext) => {
  return !!ctx.accessToken;
});

// Authorization: Role-based access
const isAdmin = rule({ cache: 'contextual' })((_parent, _args, ctx: YogaInitialContext) => {
  return ctx.role === Role.ADMIN;
});

const isOwner = rule({ cache: 'contextual' })(async (_parent, args, ctx: YogaInitialContext) => {
  if (!ctx.accessToken) {
    console.log('isOwner: No access token found');
    return false;
  }

  if (!args.input) {
    console.log('isOwner: No input provided');
    return false;
  }

  try {
    // Decode the token to get the authenticated user's ID
    const jwtPayload = await verifyToken(ctx.accessToken, ctx.jwtSecret, ctx.kvNamespace);
    // Compare token ID with requested user ID
    console.log('isOwner: jwtPayload.email:', jwtPayload.email, 'args.input.email:', args.input.email);
    return true;
    return jwtPayload.email === args.input.email;
  } catch (error) {
    console.error('Error verifying token in isOwner rule:', error);
    return false;
  }
});

// Define Shield Permissions
export const graphql_permissions = shield(
  {
    Query: {
      users: isAdmin, // Only Admin can fetch all users
      userByEmail: isAuthenticated,
      userByfield: isAuthenticated,
      adminKvAsset: isAuthenticated,
    },
    Mutation: {
      signUp: isProjectToken,
      login: isProjectToken,
      deleteUser: isAdmin,
      editUser: and(isAuthenticated, or(isOwner, isAdmin)),
      changePassword: and(isAuthenticated, or(isOwner, isAdmin)),
      logout: and(isAuthenticated, or(isOwner, isAdmin)),
    },
  },
  {
    debug: true,
    allowExternalErrors: true,
    fallbackError: new GraphQLError('Unauthorized access. Please check your permissions.', {
      extensions: { code: 'FORBIDDEN' },
    }),
  }
);
