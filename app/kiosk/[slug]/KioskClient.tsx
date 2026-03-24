'use client'

import { loginWithPin } from '@/app/actions/auth'
import { useState } from 'react'
import Link from 'next/link'

type Props = {
    org: { id: string; name: string; slug: string }
}

type Mode = 'HOME' | 'STAFF'

export default function KioskClient({ org }: Props) {
    const [mode, setMode] = useState<Mode>('HOME')
    const [pin, setPin] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleNumClick = (num: string) => {
        if (pin.length < 4) setPin(prev => prev + num)
    }

    const handleClear = () => setPin('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        const formData = new FormData()
        formData.append('pin', pin)
        formData.append('orgSlug', org.slug)
        try {
            const result = await loginWithPin(formData)
            if (result?.error) {
                setError(result.error)
                setPin('')
                setLoading(false)
            }
        } catch {
            setError('Login failed')
            setLoading(false)
        }
    }

    if (mode === 'HOME') {
        return (
            <main style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                background: 'linear-gradient(160deg, #E63946 0%, #457B9D 100%)',
                gap: '32px',
                padding: '40px 20px',
            }}>
                <div style={{ textAlign: 'center', color: 'white' }}>
                    <div style={{ fontSize: '3.5rem', marginBottom: '8px' }}>🐴</div>
                    <h1 style={{ margin: 0, fontSize: '2.4rem', fontWeight: 800 }}>{org.name}</h1>
                    <p style={{ margin: '6px 0 0', opacity: 0.85, fontSize: '1.1rem' }}>Welcome! Please select an option below.</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', width: '100%', maxWidth: '520px' }}>
                    <button
                        onClick={() => setMode('STAFF')}
                        style={{
                            background: 'white',
                            border: 'none',
                            borderRadius: '16px',
                            padding: '40px 20px',
                            cursor: 'pointer',
                            textAlign: 'center',
                            boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                            transition: 'transform 0.15s ease',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-4px)')}
                        onMouseLeave={e => (e.currentTarget.style.transform = 'none')}
                    >
                        <div style={{ fontSize: '3rem', marginBottom: '10px' }}>👤</div>
                        <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#1D3557' }}>Staff</div>
                        <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '4px' }}>Clock in / out</div>
                    </button>

                    <Link
                        href={`/kiosk/${org.slug}/checkin`}
                        style={{
                            background: 'white',
                            borderRadius: '16px',
                            padding: '40px 20px',
                            cursor: 'pointer',
                            textAlign: 'center',
                            boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                            display: 'block',
                            textDecoration: 'none',
                            transition: 'transform 0.15s ease',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-4px)')}
                        onMouseLeave={e => (e.currentTarget.style.transform = 'none')}
                    >
                        <div style={{ fontSize: '3rem', marginBottom: '10px' }}>👧</div>
                        <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#1D3557' }}>Child</div>
                        <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '4px' }}>Check in / out</div>
                    </Link>
                </div>

                <div style={{ display: 'flex', gap: '20px' }}>
                    <a href="/" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>← Switch Organization</a>
                    <a href="/admin/login" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>Admin Login</a>
                </div>
            </main>
        )
    }

    // STAFF PIN SCREEN
    return (
        <main style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            backgroundColor: 'var(--color-primary)',
            color: 'white'
        }}>
            <div className="card" style={{ width: '400px', textAlign: 'center', color: 'var(--color-dark)' }}>
                <button
                    onClick={() => { setMode('HOME'); setPin(''); setError('') }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: '0.85rem', marginBottom: '8px' }}
                >
                    ← Back
                </button>
                <h1 style={{ marginBottom: '2rem', color: 'var(--color-primary)' }}>Staff Clock-In</h1>
                <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '1rem' }}>{org.name}</p>

                <div style={{
                    fontSize: '2rem',
                    marginBottom: '2rem',
                    letterSpacing: '8px',
                    border: '2px solid var(--color-gray)',
                    padding: '10px',
                    borderRadius: '8px',
                    minHeight: '60px'
                }}>
                    {'•'.repeat(pin.length)}
                </div>

                {error && <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                        <button key={num} type="button" onClick={() => handleNumClick(num.toString())} className="btn btn-secondary" style={{ fontSize: '1.5rem', padding: '20px' }}>
                            {num}
                        </button>
                    ))}
                    <button type="button" onClick={handleClear} className="btn" style={{ backgroundColor: 'var(--color-gray)', color: 'black', fontSize: '1.2rem' }}>CLR</button>
                    <button type="button" onClick={() => handleNumClick('0')} className="btn btn-secondary" style={{ fontSize: '1.5rem', padding: '20px' }}>0</button>
                    <button type="button" onClick={handleSubmit} className="btn btn-primary" disabled={loading || pin.length < 4} style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {loading ? '...' : 'GO'}
                    </button>
                </div>

                <p style={{ fontSize: '0.9rem', color: '#666' }}>Enter your 4-digit PIN</p>
            </div>
        </main>
    )
}
