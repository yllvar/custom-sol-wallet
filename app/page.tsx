"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { ConsoleLog } from "./components/ConsoleLog"

export default function Home() {
  const [result, setResult] = useState<{ pubkey: string; privateKey: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)
    setError(null)
    setResult(null)
    setLogs([])
    const formData = new FormData(event.currentTarget)

    try {
      const response = await fetch("/api/generate-vanity-address", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Network response was not ok")
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error("Failed to get response reader")
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = new TextDecoder().decode(value)
        const lines = chunk.split("\n").filter((line) => line.trim() !== "")

        for (const line of lines) {
          try {
            const data = JSON.parse(line)
            if (data.type === "log") {
              setLogs((prevLogs) => [...prevLogs, data.message])
            } else if (data.type === "result") {
              setResult({ pubkey: data.pubkey, privateKey: data.privateKey })
              setIsLoading(false)
            }
          } catch (e: unknown) {
            console.error("Error parsing JSON:", e)
            setLogs((prevLogs) => [...prevLogs, `Error: ${e instanceof Error ? e.message : String(e)}`])
          }
        }
      }
    } catch (error) {
      setIsLoading(false)
      setError("An error occurred while generating the vanity address")
      console.error("Error:", error)
      setLogs((prevLogs) => [...prevLogs, `Error: ${(error as Error).message}`])
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert("Copied to clipboard!")
  }

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Solana Vanity Address Generator</CardTitle>
          <CardDescription>Generate custom Solana vanity addresses</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="prefix">Prefix</Label>
                <Input id="prefix" name="prefix" placeholder="e.g., DUST" />
              </div>
              <div>
                <Label htmlFor="suffix">Suffix</Label>
                <Input id="suffix" name="suffix" placeholder="e.g., NODE" />
              </div>
            </div>
            <div>
              <Label htmlFor="count">Count</Label>
              <Input id="count" name="count" type="number" defaultValue="1" min="1" />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="ignoreCase" name="ignoreCase" />
              <Label htmlFor="ignoreCase">Ignore case</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="useMnemonic" name="useMnemonic" />
              <Label htmlFor="useMnemonic">Use mnemonic</Label>
            </div>
            <div>
              <Label htmlFor="wordCount">Word count</Label>
              <Input id="wordCount" name="wordCount" type="number" defaultValue="12" min="12" max="24" />
            </div>
            <div>
              <Label htmlFor="language">Language</Label>
              <Select name="language">
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="english">English</SelectItem>
                  <SelectItem value="chinese-simplified">Chinese (Simplified)</SelectItem>
                  <SelectItem value="chinese-traditional">Chinese (Traditional)</SelectItem>
                  <SelectItem value="japanese">Japanese</SelectItem>
                  <SelectItem value="spanish">Spanish</SelectItem>
                  <SelectItem value="korean">Korean</SelectItem>
                  <SelectItem value="french">French</SelectItem>
                  <SelectItem value="italian">Italian</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="numThreads">Number of threads</Label>
              <Input id="numThreads" name="numThreads" type="number" defaultValue="10" min="1" />
            </div>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Generating..." : "Generate Vanity Address"}
            </Button>
          </form>
          {isLoading && <ConsoleLog logs={logs} />}
        </CardContent>
        {error && (
          <CardFooter>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardFooter>
        )}
        {result && (
          <CardFooter className="flex flex-col items-start space-y-2">
            <div>
              <strong>Public Key:</strong> {result.pubkey}
              <Button variant="outline" size="sm" className="ml-2" onClick={() => copyToClipboard(result.pubkey)}>
                Copy
              </Button>
            </div>
            <div>
              <strong>Private Key (Base58):</strong> {result.privateKey}
              <Button variant="outline" size="sm" className="ml-2" onClick={() => copyToClipboard(result.privateKey)}>
                Copy
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  )
}

