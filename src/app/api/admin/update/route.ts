import { NextResponse } from "next/server";
import { spawn } from "child_process";

export async function POST() {
  try {
    const child = spawn(
      "powershell.exe",
      ["-ExecutionPolicy", "Bypass", "-File", "C:\\Focus\\update-windows.ps1"],
      { detached: true, stdio: "ignore", windowsHide: false }
    );
    child.unref();
    return NextResponse.json({ started: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
