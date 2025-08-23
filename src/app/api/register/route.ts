
// icecream-inventory\src\app\api\register\route.ts

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { transporter } from "@/lib/nodemailer";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { name, email, shopName, shopAddress, password } = await req.json();

    await connectDB();

    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    const newUser = new User({
      name,
      email,
      shopName,
      shopAddress,
      password: hashedPassword,
      otp,
      otpExpires,
    });

    await newUser.save();

    // send OTP mail
    await transporter.sendMail({
      from: `"IceCream Inventory" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "OTP Verification",
      text: `Your OTP code is ${otp}. It will expire in 10 minutes.`,
    });

    return NextResponse.json({ message: "OTP sent successfully" });
  } catch (err) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
