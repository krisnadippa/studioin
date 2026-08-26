import { NextResponse } from "next/server";
import { AuthService } from "@/lib/services/auth-service";

export async function POST() {
  await AuthService.logout();
  return NextResponse.json({ success: true });
}
