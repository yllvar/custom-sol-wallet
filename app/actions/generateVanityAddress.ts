"use server"

import { exec } from "child_process"
import { promisify } from "util"
import bs58 from "bs58"

const execAsync = promisify(exec)

export async function generateVanityAddress(formData: FormData) {
  const prefix = formData.get("prefix") as string
  const suffix = formData.get("suffix") as string
  const count = formData.get("count") as string
  const ignoreCase = formData.get("ignoreCase") === "on"
  const useMnemonic = formData.get("useMnemonic") === "on"
  const wordCount = formData.get("wordCount") as string
  const language = formData.get("language") as string
  const numThreads = formData.get("numThreads") as string

  let command = "solana-keygen grind"

  if (prefix && suffix) {
    command += ` --starts-and-ends-with ${prefix}:${suffix}:${count}`
  } else if (prefix) {
    command += ` --starts-with ${prefix}:${count}`
  } else if (suffix) {
    command += ` --ends-with ${suffix}:${count}`
  }

  if (ignoreCase) command += " --ignore-case"
  if (useMnemonic) {
    command += " --use-mnemonic --no-outfile"
    if (wordCount) command += ` --word-count ${wordCount}`
    if (language) command += ` --language ${language}`
  }
  if (numThreads) command += ` --num-threads ${numThreads}`

  try {
    const { stdout } = await execAsync(command)
    const lines = stdout.split("\n")
    const pubkey = lines
      .find((line) => line.startsWith("pubkey:"))
      ?.split(":")[1]
      .trim()
    const privateKey = lines
      .find((line) => line.startsWith("private key:"))
      ?.split(":")[1]
      .trim()

    let base58PrivateKey = ""
    if (privateKey) {
      const privateKeyBuffer = Buffer.from(privateKey.replace(/\[|\]/g, "").split(",").map(Number))
      base58PrivateKey = bs58.encode(privateKeyBuffer)
    }

    return { success: true, pubkey, privateKey: base58PrivateKey }
  } catch (error) {
    console.error("Error generating vanity address:", error)
    return { success: false, error: "Failed to generate vanity address" }
  }
}

