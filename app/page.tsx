'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

type Org = { id: string; name: string; slug: string }

export default function Home() {
    const [orgs, setOrgs] = useState<Org[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/orgs')
            .then(r => r.json())
            .then(data => { setOrgs(data); setLoading(false) })
            .catch(() => setLoading(false))
    }, [])

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
                <h1 style={{ margin: 0, fontSize: '2.4rem', fontWeight: 800 }}>Rocking Horse</h1>
                <p style={{ margin: '6px 0 0', opacity: 0.85, fontSize: '1.1rem' }}>Select your location to continue</p>
            </div>

            {loading ? (
                <p style={{ color: 'rgba(255,255,255,0.7)' }}>Loading...</p>
            ) : orgs.length === 0 ? (
                <div style={{
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '16px',
                    padding: '30px',
                    textAlign: 'center',
                    color: 'white',
                    maxWidth: '400px',
                }}>
                    <p>No organizations set up yet.</p>
                    <Link href="/master/login" style={{
                        display: 'inline-block',
                        marginTop: '10px',
                        padding: '10px 20px',
                        background: 'white',
                        color: '#1D3557',
                        borderRadius: '10px',
                        fontWeight: 600,
                        textDecoration: 'none',
                    }}>
                        Master Admin Setup →
                    </Link>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: orgs.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '20px',
                    width: '100%',
                    maxWidth: '600px',
                }}>
                    {orgs.map(org => (
                        <Link
                            key={org.id}
                            href={`/kiosk/${org.slug}`}
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
                            <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🏫</div>
                            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#1D3557' }}>{org.name}</div>
                            <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '4px' }}>Tap to enter</div>
                        </Link>
                    ))}
                </div>
            )}

            <div style={{ display: 'flex', gap: '20px' }}>
                <a href="/admin/login" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>Admin Login</a>
                <a href="/master/login" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>Master Admin</a>
            </div>
        </main>
    )
}
