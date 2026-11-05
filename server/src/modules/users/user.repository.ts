import { UserModel, type User } from "./user.model.js";

export async function insertUsers(users: readonly User[]): Promise<User[]> {
  return UserModel.insertMany(users);
}

export async function findUserByEmail(email: string): Promise<User | null> {
  return UserModel.findOne({ email: email.toLowerCase() }).lean().exec();
}
