// icecream-inventory\src\app\api\bank-details\route.ts


import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import BankDetails from "@/models/BankDetails";

export async function GET(req: Request) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const sellerId = searchParams.get("sellerId");

  if (!sellerId) return NextResponse.json({ error: "sellerId required" }, { status: 400 });

  const bank = await BankDetails.findOne({ sellerId });
  return NextResponse.json(bank || {});
}

export async function POST(req: Request) {
  await connectDB();
  const body = await req.json();
  const { sellerId, bankName, ifscCode, branchName, bankingName, accountNumber } = body;

  if (!sellerId || !bankName || !ifscCode || !branchName || !bankingName || !accountNumber) {
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  }

  let bank = await BankDetails.findOne({ sellerId });
  if (bank) {
    bank.bankName = bankName;
    bank.ifscCode = ifscCode;
    bank.branchName = branchName;
    bank.bankingName = bankingName;
    bank.accountNumber = accountNumber;
    await bank.save();
  } else {
    bank = await BankDetails.create({ sellerId, bankName, ifscCode, branchName, bankingName, accountNumber });
  }

  return NextResponse.json(bank);
}
