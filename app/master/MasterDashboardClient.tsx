'use client'

import { useState } from 'react'
import { createOrganization } from '@/app/actions/master'
import { logout } from '@/app/actions/auth'
import Link from 'next/link'

type Org = {
    id: string
    name: string
    slug: string
    isActive: boolean
    createdAt: Date
    locations: { id: string; name: string; isActive: boolean }[]
    _count: { users: number; children: number }
}

export default function MasterDashboardClient({ organizations }: { organizations: Org[] }) {
    const [showCreate, setShowCreate] = useState(false)
    const [name, setName] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        const fd = new FormData()
        fd.append('name', name)
        const result = await createOrganization(fd)
        if (result?.error) {
            setError(result.error)
        } else {
            setName('')
            setShowCreate(false)
            window.location.reload()
        }
        setLoading(false)
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 100%)',
            color: '#f8fafc',
        }}>
            {/* Header */}
            <header style={{
                padding: '20px 32px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '1.8rem' }}>🔐</span>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>Master Admin</h1>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Platform Management</p>
                    </div>
                </div>
                <form action={logout}>
                    <button type="submit" style={{
                        padding: '8px 20px',
                        background: 'rgba(239,68,68,0.15)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: '8px',
                        color: '#fca5a5',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                    }}>
                        Logout
                    </button>
                </form>
            </header>

            <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px' }}>
                {/* Stats Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                    <div style={statCardStyle}>
                        <div style={{ fontSize: '2rem', fontWeight: 700, color: '#3b82f6' }}>{organizations.length}</div>
                        <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Organizations</div>
                    </div>
                    <div style={statCardStyle}>
                        <div style={{ fontSize: '2rem', fontWeight: 700, color: '#10b981' }}>
                            {organizations.filter(o => o.isActive).length}
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Active</div>
                    </div>
                    <div style={statCardStyle}>
                        <div style={{ fontSize: '2rem', fontWeight: 700, color: '#8b5cf6' }}>
                            {organizations.reduce((sum, o) => sum + o.locations.length, 0)}
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Total Locations</div>
                    </div>
                    <div style={statCardStyle}>
                        <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f59e0b' }}>
                            {organizations.reduce((sum, o) => sum + o._count.users, 0)}
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Total Staff</div>
                    </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Organizations</h2>
                    <button
                        onClick={() => setShowCreate(!showCreate)}
                        style={{
                            padding: '10px 20px',
                            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                            border: 'none',
                            borderRadius: '10px',
                            color: 'white',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                        }}
                    >
                        + New Organization
                    </button>
                </div>

                {/* Create Form */}
                {showCreate && (
                    <div style={{
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '14px',
                        padding: '24px',
                        marginBottom: '24px',
                        border: '1px solid rgba(255,255,255,0.1)',
                    }}>
                        <form onSubmit={handleCreate} style={{ display: 'flex', gap: '12px', alignItems: 'end' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '6px', color: '#94a3b8', fontSize: '0.85rem' }}>Organization Name</label>
                                <input
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="e.g. Rocking Horse Childcare"
                                    required
                                    style={inputStyle}
                                />
                            </div>
                            <button type="submit" disabled={loading} style={{
                                padding: '12px 24px',
                                background: '#3b82f6',
                                border: 'none',
                                borderRadius: '10px',
                                color: 'white',
                                fontWeight: 600,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                            }}>
                                {loading ? 'Creating...' : 'Create'}
                            </button>
                        </form>
                        {error && <p style={{ color: '#fca5a5', marginTop: '10px', fontSize: '0.9rem' }}>{error}</p>}
                    </div>
                )}

                {/* Org Cards */}
                <div style={{ display: 'grid', gap: '16px' }}>
                    {organizations.length === 0 && (
                        <div style={{
                            textAlign: 'center',
                            padding: '60px 20px',
                            color: '#64748b',
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: '14px',
                        }}>
                            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🏢</div>
                            <p>No organizations yet. Create one to get started!</p>
                        </div>
                    )}

                    {organizations.map(org => (
                        <Link
                            key={org.id}
                            href={`/master/orgs/${org.id}`}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                borderRadius: '14px',
                                padding: '24px',
                                border: '1px solid rgba(255,255,255,0.08)',
                                textDecoration: 'none',
                                color: 'inherit',
                                display: 'block',
                                transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                                e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)'
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                                        <h3 style={{ margin: 0, fontSize: '1.15rem' }}>{org.name}</h3>
                                        <span style={{
                                            padding: '2px 10px',
                                            borderRadius: '20px',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            background: org.isActive ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                            color: org.isActive ? '#34d399' : '#fca5a5',
                                        }}>
                                            {org.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
                                        Slug: <code style={{ color: '#94a3b8' }}>{org.slug}</code>
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: '20px', color: '#94a3b8', fontSize: '0.85rem' }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontWeight: 700, fontSize: '1.2rem', color: '#f8fafc' }}>{org.locations.length}</div>
                                        <div>Locations</div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontWeight: 700, fontSize: '1.2rem', color: '#f8fafc' }}>{org._count.users}</div>
                                        <div>Staff</div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontWeight: 700, fontSize: '1.2rem', color: '#f8fafc' }}>{org._count.children}</div>
                                        <div>Children</div>
                                    </div>
                                </div>
                            </div>
                            {org.locations.length > 0 && (
                                <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                                    {org.locations.map(loc => (
                                        <span key={loc.id} style={{
                                            padding: '4px 12px',
                                            background: 'rgba(255,255,255,0.06)',
                                            borderRadius: '8px',
                                            fontSize: '0.8rem',
                                            color: '#cbd5e1',
                                        }}>
                                            📍 {loc.name}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </Link>
                    ))}
                </div>
            </main>
        </div>
    )
}

const statCardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '14px',
    padding: '20px',
    border: '1px solid rgba(255,255,255,0.08)',
    textAlign: 'center',
}

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '10px',
    color: '#f8fafc',
    fontSize: '1rem',
    outline: 'none',
    boxSizing: 'border-box',
}
