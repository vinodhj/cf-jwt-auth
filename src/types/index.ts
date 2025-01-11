import { gql } from 'graphql-tag';

export const typeDefs = gql`
  scalar DateTime

  enum Role {
    ADMIN
    USER
  }

  type User {
    id: ID! #nano_id
    name: String!
    email: String!
    password: String! # hashed
    role: Role!
    created_at: DateTime!
    updated_at: DateTime!
  }

  input SignUpInput {
    name: String!
    email: String!
    password: String!
  }

  type SignUpResponse {
    success: Boolean!
    user: UserSuccessResponse
  }

  input LoginInput {
    email: String!
    password: String!
  }
  
  type LoginResponse {
    success: Boolean!
    token: String
    user: UserSuccessResponse
  }

  type UserSuccessResponse {
    id: ID!
    name: String!
    email: String!
    role: Role!
  }

  type UserResponse {
    id: ID!
    name: String!
    email: String!
    role: Role!
    created_at: DateTime!
    updated_at: DateTime!
  }

  type Query {
    user(id: ID!): UserResponse
    users: [UserResponse]
  }

  type Mutation {
    signUp(input: SignUpInput): SignUpResponse!
    login(input: LoginInput!): LoginResponse!
  }
`;
