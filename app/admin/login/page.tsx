'use client'

import { useState } from 'react'
import { loginAdmin } from '@/app/actions/auth'

export default function AdminLoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [showHelp, setShowHelp] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        const formData = new FormData()
        formData.append('email', email)
        formData.append('password', password)

        try {
            const result = await loginAdmin(formData)
            if (result?.error) {
                setError(result.error)
                setLoading(false)
            }
        } catch (e) {
            setError('Login failed')
            setLoading(false)
        }
    }

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            background: 'linear-gradient(160deg, #1D3557 0%, #457B9D 100%)',
        }}>
            <div style={{
                width: '420px',
                padding: '40px',
                background: 'rgba(255,255,255,0.05)',
                backdropFilter: 'blur(20px)',
                borderRadius: '20px',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
            }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🏢</div>
                    <h1 style={{ color: '#f8fafc', fontSize: '1.6rem', fontWeight: 700, margin: 0 }}>
                        Organization Admin
                    </h1>
                    <p style={{ color: '#E0E7FF', fontSize: '0.9rem', marginTop: '6px' }}>
                        Management Portal Login
                    </p>
                </div>

                {error && (
                    <div style={{
                        background: 'rgba(239,68,68,0.15)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: '10px',
                        padding: '10px 14px',
                        color: '#fca5a5',
                        fontSize: '0.9rem',
                        marginBottom: '20px',
                        textAlign: 'center',
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '6px', color: '#E0E7FF', fontSize: '0.85rem', fontWeight: 500 }}>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            style={{
                                width: '100%',
                                padding: '12px 14px',
                                background: 'rgba(255,255,255,0.07)',
                                border: '1px solid rgba(255,255,255,0.15)',
                                borderRadius: '10px',
                                color: '#f8fafc',
                                fontSize: '1rem',
                                outline: 'none',
                                boxSizing: 'border-box',
                            }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '6px', color: '#E0E7FF', fontSize: '0.85rem', fontWeight: 500 }}>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            style={{
                                width: '100%',
                                padding: '12px 14px',
                                background: 'rgba(255,255,255,0.07)',
                                border: '1px solid rgba(255,255,255,0.15)',
                                borderRadius: '10px',
                                color: '#f8fafc',
                                fontSize: '1rem',
                                outline: 'none',
                                boxSizing: 'border-box',
                            }}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            padding: '13px',
                            background: loading ? '#457B9D' : 'linear-gradient(135deg, #E63946, #457B9D)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            fontSize: '1rem',
                            fontWeight: 600,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            marginTop: '4px',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        {loading ? 'Authenticating...' : 'Sign In'}
                    </button>
                    <div style={{ textAlign: 'right', marginTop: '-4px' }}>
                        <button 
                            type="button" 
                            onClick={() => setShowHelp(!showHelp)}
                            style={{ background: 'none', border: 'none', color: '#A0AEC0', fontSize: '0.8rem', cursor: 'pointer', padding: 0 }}
                        >
                            Forgot Password?
                        </button>
                    </div>
                    {showHelp && (
                        <div style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', padding: '12px', color: '#E0E7FF', fontSize: '0.85rem', textAlign: 'center', marginTop: '4px' }}>
                            Please contact your Master Administrator to reset your password or update your account details.
                        </div>
                    )}
                </form>
                <div style={{ marginTop: '24px', textAlign: 'center' }}>
                    <a href="/" style={{ color: '#A0AEC0', fontSize: '0.85rem', textDecoration: 'none' }}>← Back to Home</a>
                </div>
            </div>
        </div>
    )
}
