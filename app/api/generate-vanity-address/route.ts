import type { NextRequest } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"
import bs58 from "bs58"
import fs from "fs/promises"

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  const formData = await request.formData()
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

  const encoder = new TextEncoder()
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  const sendLog = async (message: string) => {
    await writer.write(encoder.encode(JSON.stringify({ type: "log", message }) + "\n"))
  }

  execAsync(command)
    .then(async ({ stdout, stderr }) => {
      if (stderr) {
        await sendLog(`Error: ${stderr}`)
      }

      const lines = stdout.split("\n")
      await sendLog("Command output:")
      for (const line of lines) {
        await sendLog(line)
      }

      let pubkey = ""
      let privateKey = ""

      // Look for the line containing the keypair file name
      const keypairLine = lines.find((line) => line.includes("Wrote keypair to"))
      if (keypairLine) {
        // Extract the filename
        const filename = keypairLine.split(" ").pop()
        if (filename) {
          // The filename is the public key
          pubkey = filename.replace(".json", "")
          await sendLog(`Extracted public key: ${pubkey}`)

          // Read the keypair file to get the private key
          try {
            const keypairContent = await fs.readFile(filename, "utf8")
            const keypairJson = JSON.parse(keypairContent)
            privateKey = bs58.encode(Buffer.from(keypairJson))
            await sendLog("Successfully extracted private key")

            // Delete the keypair file after reading
            await fs.unlink(filename)
            await sendLog(`Deleted keypair file: ${filename}`)
          } catch (error: unknown) {
            await sendLog(`Error reading keypair file: ${(error as Error).message}`)
          }
        }
      }

      if (!pubkey || !privateKey) {
        throw new Error("Failed to extract pubkey or private key from command output")
      }

      await writer.write(
        encoder.encode(
          JSON.stringify({
            type: "result",
            pubkey,
            privateKey,
          }) + "\n",
        ),
      )
    })
    .catch(async (error) => {
      await sendLog(`Error: ${error.message}`)
    })
    .finally(async () => {
      await writer.close()
    })

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}

