// abilities.ts
import { createMongoAbility, AbilityBuilder, AbilityClass, MongoAbility } from '@casl/ability';
import { Role } from 'db/schema/user';

export type Actions = 'manage' | 'read' | 'update' | 'delete';
export type Subjects = 'User' | { id: string } | 'all';

export type AppAbility = MongoAbility<[Actions, Subjects]>;

export interface IUser {
  id: string;
  role: Role;
  _id?: string; // Add this line to include the _id property
}

export function defineAbilitiesFor(user: IUser): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<MongoAbility<[Actions, Subjects]>>(
    createMongoAbility as unknown as AbilityClass<AppAbility>
  );

  if (user.role === Role.ADMIN) {
    can('manage', 'all'); // Admins can do anything
  } else {
    can('read', 'User'); // Regular users can read user data
    // Allow users to update only their own profile
    can('update', 'User', { id: { $eq: user.id } });
    // For example, prevent deletion for non-admins
    cannot('delete', 'User');
    //can('delete', 'User', { id: { $eq: user.id } });
  }

  return build({
    // This option is useful if you want to check nested properties
    detectSubjectType: (object) => (object as any).__typename || 'User',
  });
}
