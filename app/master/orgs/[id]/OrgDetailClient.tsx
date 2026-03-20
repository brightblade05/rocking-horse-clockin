'use client'

import { useState } from 'react'
import { createLocation, updateLocation, createOrgAdmin, updateOrganization } from '@/app/actions/master'
import Link from 'next/link'

type OrgDetail = {
    id: string
    name: string
    slug: string
    isActive: boolean
    locations: { id: string; name: string; address: string | null; phone: string | null; isActive: boolean }[]
    users: { id: string; name: string; email: string | null; adminRole: string; isActive: boolean; locationId: string | null }[]
    _count: { users: number; children: number; guardians: number }
}

export default function OrgDetailClient({ org }: { org: OrgDetail }) {
    const [showAddLocation, setShowAddLocation] = useState(false)
    const [showAddAdmin, setShowAddAdmin] = useState(false)
    const [locName, setLocName] = useState('')
    const [locAddress, setLocAddress] = useState('')
    const [locPhone, setLocPhone] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    // Admin form
    const [adminName, setAdminName] = useState('')
    const [adminEmail, setAdminEmail] = useState('')
    const [adminPassword, setAdminPassword] = useState('')
    const [adminPin, setAdminPin] = useState('')
    const [adminRole, setAdminRole] = useState('SUPERADMIN')

    const handleAddLocation = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true); setError('')
        const fd = new FormData()
        fd.append('organizationId', org.id)
        fd.append('name', locName)
        if (locAddress) fd.append('address', locAddress)
        if (locPhone) fd.append('phone', locPhone)
        const result = await createLocation(fd)
        if (result?.error) setError(result.error)
        else { setLocName(''); setLocAddress(''); setLocPhone(''); setShowAddLocation(false); window.location.reload() }
        setLoading(false)
    }

    const handleAddAdmin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true); setError('')
        const fd = new FormData()
        fd.append('organizationId', org.id)
        fd.append('name', adminName)
        fd.append('email', adminEmail)
        fd.append('password', adminPassword)
        fd.append('pin', adminPin)
        fd.append('adminRole', adminRole)
        const result = await createOrgAdmin(fd)
        if (result?.error) setError(result.error)
        else { setAdminName(''); setAdminEmail(''); setAdminPassword(''); setAdminPin(''); setShowAddAdmin(false); window.location.reload() }
        setLoading(false)
    }

    const handleToggleOrg = async () => {
        const fd = new FormData()
        fd.append('id', org.id)
        fd.append('name', org.name)
        fd.append('isActive', (!org.isActive).toString())
        await updateOrganization(fd)
        window.location.reload()
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
                    <Link href="/master" style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.9rem' }}>← Back</Link>
                    <span style={{ color: '#334155' }}>|</span>
                    <h1 style={{ margin: 0, fontSize: '1.3rem' }}>{org.name}</h1>
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
                <button onClick={handleToggleOrg} style={{
                    padding: '8px 16px',
                    background: org.isActive ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                    border: '1px solid ' + (org.isActive ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'),
                    borderRadius: '8px',
                    color: org.isActive ? '#fca5a5' : '#34d399',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                }}>
                    {org.isActive ? 'Deactivate' : 'Activate'}
                </button>
            </header>

            <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px' }}>
                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                    {[
                        { label: 'Locations', value: org.locations.length, color: '#3b82f6' },
                        { label: 'Staff', value: org._count.users, color: '#10b981' },
                        { label: 'Children', value: org._count.children, color: '#f59e0b' },
                        { label: 'Guardians', value: org._count.guardians, color: '#8b5cf6' },
                    ].map(s => (
                        <div key={s.label} style={statCardStyle}>
                            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: s.color }}>{s.value}</div>
                            <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Org Info */}
                <div style={{ ...cardStyle, marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                            <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 4px' }}>Kiosk URL</p>
                            <code style={{ color: '#3b82f6', fontSize: '0.95rem' }}>
                                /kiosk/{org.slug}
                            </code>
                        </div>
                        <div>
                            <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 4px' }}>Admin Login</p>
                            <code style={{ color: '#3b82f6', fontSize: '0.95rem' }}>
                                /admin/login
                            </code>
                        </div>
                    </div>
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
                    }}>
                        {error}
                    </div>
                )}

                {/* Locations */}
                <div style={{ marginBottom: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>📍 Locations</h2>
                        <button onClick={() => setShowAddLocation(!showAddLocation)} style={actionBtnStyle}>
                            + Add Location
                        </button>
                    </div>

                    {showAddLocation && (
                        <form onSubmit={handleAddLocation} style={{ ...cardStyle, marginBottom: '16px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={labelStyle}>Name *</label>
                                    <input value={locName} onChange={e => setLocName(e.target.value)} required style={inputStyle} placeholder="e.g. Porter" />
                                </div>
                                <div>
                                    <label style={labelStyle}>Address</label>
                                    <input value={locAddress} onChange={e => setLocAddress(e.target.value)} style={inputStyle} placeholder="123 Main St" />
                                </div>
                                <div>
                                    <label style={labelStyle}>Phone</label>
                                    <input value={locPhone} onChange={e => setLocPhone(e.target.value)} style={inputStyle} placeholder="(555) 123-4567" />
                                </div>
                            </div>
                            <div style={{ marginTop: '12px', display: 'flex', gap: '10px' }}>
                                <button type="submit" disabled={loading} style={{ ...actionBtnStyle, background: '#3b82f6' }}>
                                    {loading ? 'Adding...' : 'Add Location'}
                                </button>
                                <button type="button" onClick={() => setShowAddLocation(false)} style={{ ...actionBtnStyle, background: 'rgba(255,255,255,0.1)' }}>
                                    Cancel
                                </button>
                            </div>
                        </form>
                    )}

                    <div style={{ display: 'grid', gap: '10px' }}>
                        {org.locations.length === 0 && (
                            <p style={{ color: '#64748b', textAlign: 'center', padding: '30px' }}>No locations yet.</p>
                        )}
                        {org.locations.map(loc => (
                            <div key={loc.id} style={{
                                ...cardStyle,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '1rem' }}>{loc.name}</div>
                                    {loc.address && <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{loc.address}</div>}
                                    {loc.phone && <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{loc.phone}</div>}
                                </div>
                                <span style={{
                                    padding: '3px 10px',
                                    borderRadius: '20px',
                                    fontSize: '0.75rem',
                                    background: loc.isActive ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                    color: loc.isActive ? '#34d399' : '#fca5a5',
                                }}>
                                    {loc.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Org Admins */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>👤 Organization Admins</h2>
                        <button onClick={() => setShowAddAdmin(!showAddAdmin)} style={actionBtnStyle}>
                            + Add Admin
                        </button>
                    </div>

                    {showAddAdmin && (
                        <form onSubmit={handleAddAdmin} style={{ ...cardStyle, marginBottom: '16px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={labelStyle}>Name *</label>
                                    <input value={adminName} onChange={e => setAdminName(e.target.value)} required style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Email *</label>
                                    <input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} required style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Password *</label>
                                    <input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} required style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>PIN (4-digit) *</label>
                                    <input value={adminPin} onChange={e => setAdminPin(e.target.value)} required maxLength={4} style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Role</label>
                                    <select value={adminRole} onChange={e => setAdminRole(e.target.value)} style={inputStyle}>
                                        <option value="SUPERADMIN">Super Admin</option>
                                        <option value="MANAGER">Manager</option>
                                        <option value="FRONT_DESK">Front Desk</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ marginTop: '12px', display: 'flex', gap: '10px' }}>
                                <button type="submit" disabled={loading} style={{ ...actionBtnStyle, background: '#3b82f6' }}>
                                    {loading ? 'Creating...' : 'Create Admin'}
                                </button>
                                <button type="button" onClick={() => setShowAddAdmin(false)} style={{ ...actionBtnStyle, background: 'rgba(255,255,255,0.1)' }}>
                                    Cancel
                                </button>
                            </div>
                        </form>
                    )}

                    <div style={{ display: 'grid', gap: '10px' }}>
                        {org.users.length === 0 && (
                            <p style={{ color: '#64748b', textAlign: 'center', padding: '30px' }}>No admins assigned yet.</p>
                        )}
                        {org.users.map(admin => (
                            <div key={admin.id} style={{
                                ...cardStyle,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}>
                                <div>
                                    <div style={{ fontWeight: 600 }}>{admin.name}</div>
                                    <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{admin.email}</div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <span style={{
                                        padding: '3px 10px',
                                        borderRadius: '20px',
                                        fontSize: '0.75rem',
                                        background: 'rgba(59,130,246,0.15)',
                                        color: '#93c5fd',
                                    }}>
                                        {admin.adminRole}
                                    </span>
                                    <span style={{
                                        padding: '3px 10px',
                                        borderRadius: '20px',
                                        fontSize: '0.75rem',
                                        background: admin.isActive ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                        color: admin.isActive ? '#34d399' : '#fca5a5',
                                    }}>
                                        {admin.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
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

const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '14px',
    padding: '20px',
    border: '1px solid rgba(255,255,255,0.08)',
}

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '8px',
    color: '#f8fafc',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '4px',
    color: '#94a3b8',
    fontSize: '0.8rem',
    fontWeight: 500,
}

const actionBtnStyle: React.CSSProperties = {
    padding: '8px 16px',
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: '0.85rem',
}
