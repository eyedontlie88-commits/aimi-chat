'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface ProviderStatus {
    available: boolean
}

interface HealthData {
    providers: Record<string, ProviderStatus>
    config: {
        defaultProvider: string
        fallbackEnabled: boolean
        maxAttempts: number
    }
}

interface TestResult {
    status: 'ok' | 'fail'
    provider: string
    model?: string
    latencyMs?: number
    reply?: string
    errorCode?: string
    errorMessage?: string
    httpStatus?: number
}

export default function AdminKeysPage() {
    const router = useRouter()
    const [health, setHealth] = useState<HealthData | null>(null)
    const [loading, setLoading] = useState(true)
    const [testing, setTesting] = useState<string | null>(null)
    const [testResults, setTestResults] = useState<Record<string, TestResult>>({})

    useEffect(() => {
        fetchHealth()
    }, [])

    async function fetchHealth() {
        try {
            const res = await fetch('/api/admin/keys/health')
            if (res.status === 404) {
                router.push('/')
                return
            }
            const data = await res.json()
            setHealth(data)
        } catch (error) {
            console.error('Failed to fetch health:', error)
        } finally {
            setLoading(false)
        }
    }

    async function testProvider(provider: string) {
        setTesting(provider)
        try {
            const res = await fetch('/api/admin/keys/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider }),
            })
            const result = await res.json()
            setTestResults(prev => ({ ...prev, [provider]: result }))
        } catch (error) {
            console.error(`Test failed for ${provider}:`, error)
        } finally {
            setTesting(null)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="text-gray-400">Loading...</div>
            </div>
        )
    }

    if (!health) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="text-red-400">Failed to load dashboard</div>
            </div>
        )
    }

    const providers = Object.keys(health.providers)

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Admin Keys Dashboard</h1>
                    <p className="text-gray-400">Monitor provider health and test API keys</p>
                </div>

                {/* Config Display */}
                <div className="bg-gray-900 rounded-lg p-6 mb-8 border border-gray-800">
                    <h2 className="text-xl font-semibold mb-4">Configuration</h2>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <div className="text-sm text-gray-400">Default Provider</div>
                            <div className="text-lg font-mono text-blue-400">{health.config.defaultProvider}</div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-400">Fallback Enabled</div>
                            <div className="text-lg font-mono text-green-400">
                                {health.config.fallbackEnabled ? 'Yes' : 'No'}
                            </div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-400">Max Attempts</div>
                            <div className="text-lg font-mono text-yellow-400">{health.config.maxAttempts}</div>
                        </div>
                    </div>
                </div>

                {/* Provider Status Table */}
                <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-800">
                            <tr>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Provider</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Status</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Test</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Result</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {providers.map(provider => {
                                const status = health.providers[provider]
                                const testResult = testResults[provider]
                                const isDefault = health.config.defaultProvider === provider

                                return (
                                    <tr key={provider} className="hover:bg-gray-800/50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-white">{provider}</span>
                                                {isDefault && (
                                                    <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
                                                        DEFAULT
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {status.available ? (
                                                <span className="inline-flex items-center gap-1.5 text-sm text-green-400">
                                                    <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                                                    Available
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
                                                    <span className="w-2 h-2 bg-gray-600 rounded-full"></span>
                                                    No Key
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => testProvider(provider)}
                                                disabled={!status.available || testing === provider}
                                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded transition-colors"
                                            >
                                                {testing === provider ? 'Testing...' : 'Test'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            {testResult && (
                                                <div className="text-sm">
                                                    {testResult.status === 'ok' ? (
                                                        <div className="text-green-400">
                                                            ✓ OK ({testResult.latencyMs}ms)
                                                        </div>
                                                    ) : (
                                                        <div className="text-red-400">
                                                            ✗ {testResult.errorCode}
                                                            {testResult.errorMessage && (
                                                                <div className="text-xs text-gray-500 mt-1">
                                                                    {testResult.errorMessage}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Back button */}
                <div className="mt-8">
                    <button
                        onClick={() => router.push('/')}
                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition-colors"
                    >
                        ← Back to Home
                    </button>
                </div>
            </div>
        </div>
    )
}
