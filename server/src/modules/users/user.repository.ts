import { UserModel, type User } from "./user.model.js";

export async function insertUsers(users: readonly User[]): Promise<User[]> {
  return UserModel.insertMany(users);
}

export async function createUser(user: Omit<User, "_id">): Promise<User> {
  const createdUser = await UserModel.create(user);
  return createdUser.toObject();
}

export async function findUserByEmail(email: string): Promise<User | null> {
  return UserModel.findOne({ email: email.toLowerCase() }).lean().exec();
}

export async function findUserById(id: string): Promise<User | null> {
  return UserModel.findById(id).lean().exec();
}
