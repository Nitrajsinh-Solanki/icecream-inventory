// icecream-inventory\src\models\User.ts

import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  shopName: string;
  shopAddress: string;
  password: string;
  otp: string | null;
  otpExpires: Date | null;
  isVerified: boolean;
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  shopName: { type: String, required: true },
  shopAddress: { type: String, required: true },
  password: { type: String, required: true },
  otp: { type: String, default: null },
  otpExpires: { type: Date, default: null },
  isVerified: { type: Boolean, default: false },
});

export default mongoose.models.User ||
  mongoose.model<IUser>("User", UserSchema);
