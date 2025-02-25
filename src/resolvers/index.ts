import { Resolvers } from 'generated';
import { AuthMutation } from './token-auth/mutations';
import { AuthQuery } from './token-auth/queries';

const Query = {
  ...AuthQuery,
};
const Mutation = {
  ...AuthMutation,
};

export const resolvers: Resolvers = { Query, Mutation };
