import { NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export async function GET() {
  try {
    const { stdout, stderr } = await execAsync("solana --version")
    console.log("Solana CLI version:", stdout)
    if (stderr) {
      console.error("Solana CLI error:", stderr)
    }
    return NextResponse.json({ success: true, version: stdout.trim() })
  } catch (error) {
    console.error("Error checking Solana CLI:", error)
    return NextResponse.json({ success: false, error: "Failed to check Solana CLI" }, { status: 500 })
  }
}

