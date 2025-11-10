export enum UserRole {
  Admin = 'admin',
  User = 'user',
}

export interface User {
  id: string;
  username: string;
  password?: string; // Optional for security when sending to client
  role: UserRole;
  assignedHouseIds: string[];
}
