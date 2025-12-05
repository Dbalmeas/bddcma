"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { supabase, testConnection, getEventsCount } from "@/lib/supabase"
import { CheckCircle2, XCircle, Database, Loader2 } from "lucide-react"

export default function TestDatabasePage() {
  const [status, setStatus] = useState<{
    connected: boolean | null
    message: string
    count?: number
  }>({
    connected: null,
    message: "Click 'Test Connection' to check Supabase connection",
  })
  const [loading, setLoading] = useState(false)

  const handleTestConnection = async () => {
    setLoading(true)
    try {
      const result = await testConnection()
      setStatus({
        connected: result.success,
        message: result.message,
      })
    } catch (error: any) {
      setStatus({
        connected: false,
        message: `Error: ${error.message}`,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGetCount = async () => {
    setLoading(true)
    try {
      const result = await getEventsCount()
      if (result.success) {
        setStatus({
          connected: true,
          message: `Database connected successfully!`,
          count: result.count,
        })
      } else {
        setStatus({
          connected: false,
          message: `Error: ${result.error}`,
        })
      }
    } catch (error: any) {
      setStatus({
        connected: false,
        message: `Error: ${error.message}`,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCheckTables = async () => {
    setLoading(true)
    try {
      // Test si les tables existent
      const tables = [
        'events',
        'event_labels',
        'event_locations',
        'event_media',
        'event_users',
        'user_metrics'
      ]

      const results = []
      for (const table of tables) {
        const { error } = await supabase.from(table).select('count').limit(1)
        results.push({
          table,
          exists: !error,
          error: error?.message
        })
      }

      const allExist = results.every(r => r.exists)
      setStatus({
        connected: allExist,
        message: allExist
          ? 'All tables exist! ✅'
          : `Missing tables: ${results.filter(r => !r.exists).map(r => r.table).join(', ')}`,
      })

      console.log('Table check results:', results)
    } catch (error: any) {
      setStatus({
        connected: false,
        message: `Error: ${error.message}`,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Database Connection Test</h1>
          <p className="text-muted-foreground">
            Test your Supabase connection and check database status
          </p>
        </div>

        <div className="grid gap-4">
          {/* Status Card */}
          <Card className="p-6">
            <div className="flex items-start gap-4">
              {status.connected === null && (
                <Database className="h-8 w-8 text-muted-foreground" />
              )}
              {status.connected === true && (
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              )}
              {status.connected === false && (
                <XCircle className="h-8 w-8 text-red-500" />
              )}
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Connection Status</h3>
                <p className="text-sm text-muted-foreground">{status.message}</p>
                {status.count !== undefined && (
                  <p className="text-sm font-medium mt-2">
                    Total events in database: {status.count.toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Actions */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Test Actions</h3>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleTestConnection}
                disabled={loading}
                variant="default"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" />
                    Test Connection
                  </>
                )}
              </Button>

              <Button
                onClick={handleCheckTables}
                disabled={loading}
                variant="outline"
              >
                Check Tables
              </Button>

              <Button
                onClick={handleGetCount}
                disabled={loading}
                variant="outline"
              >
                Get Events Count
              </Button>
            </div>
          </Card>

          {/* Configuration Info */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Configuration</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Supabase URL:</span>
                <span className="font-mono">
                  {process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not configured'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">API Key:</span>
                <span className="font-mono">
                  {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
                    ? '••••••••••••' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.slice(-8)
                    : 'Not configured'}
                </span>
              </div>
            </div>
          </Card>

          {/* Next Steps */}
          <Card className="p-6 bg-blue-950/20 border-blue-500/20">
            <h3 className="font-semibold mb-2 text-blue-400">Next Steps</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Run the schema.sql file in your Supabase SQL Editor</li>
              <li>Click "Check Tables" to verify all tables were created</li>
              <li>Run the data ingestion script to import JSONL files</li>
              <li>Test queries and start building the AI agent</li>
            </ol>
          </Card>
        </div>

        {/* Instructions */}
        <Card className="p-6 mt-6">
          <h3 className="font-semibold mb-3">How to Run the Schema</h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium mb-1">1. Open Supabase Dashboard</p>
              <p className="text-muted-foreground ml-4">
                Go to{" "}
                <a
                  href="https://fhwflhowbhqkheeqpxqh.supabase.co"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  your Supabase project
                </a>
              </p>
            </div>
            <div>
              <p className="font-medium mb-1">2. Navigate to SQL Editor</p>
              <p className="text-muted-foreground ml-4">
                Click on "SQL Editor" in the left sidebar
              </p>
            </div>
            <div>
              <p className="font-medium mb-1">3. Copy and Run Schema</p>
              <p className="text-muted-foreground ml-4">
                Copy the contents of{" "}
                <code className="bg-muted px-1 py-0.5 rounded">
                  supabase/schema.sql
                </code>{" "}
                and run it in the SQL Editor
              </p>
            </div>
            <div>
              <p className="font-medium mb-1">4. Verify Tables</p>
              <p className="text-muted-foreground ml-4">
                Click "Check Tables" above to verify all tables were created successfully
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
