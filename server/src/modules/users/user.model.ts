import { model, Schema, Types } from "mongoose";

export type UserRole = "user" | "authority";

export interface User {
  _id?: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
}

const userSchema = new Schema<User>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["user", "authority"], default: "user", required: true },
  },
  { timestamps: true },
);

export const UserModel = model<User>("User", userSchema);
