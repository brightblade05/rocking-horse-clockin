'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { checkInChild, checkOutChild } from '@/app/actions/children'

type Child = {
    id: string
    firstName: string
    lastName: string
    classroom: string | null
    guardian: { firstName: string; lastName: string } | null
    attendance: { checkIn: Date; checkOut: Date | null }[]
}

type Props = {
    children: Child[]
}

export default function ChildCheckinClient({ children }: Props) {
    const [search, setSearch] = useState('')
    const [selectedChild, setSelectedChild] = useState<Child | null>(null)
    const [guardianName, setGuardianName] = useState('')
    const [mode, setMode] = useState<'SELECT' | 'CONFIRM_IN' | 'CONFIRM_OUT' | 'SUCCESS'>('SELECT')
    const [successMsg, setSuccessMsg] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const filtered = useMemo(() => {
        const q = search.toLowerCase()
        if (!q) return children
        return children.filter(c =>
            c.firstName.toLowerCase().includes(q) ||
            c.lastName.toLowerCase().includes(q) ||
            (c.classroom?.toLowerCase().includes(q))
        )
    }, [search, children])

    const isCheckedIn = (child: Child) =>
        child.attendance.length > 0 && !child.attendance[0].checkOut

    const handleSelect = (child: Child) => {
        setSelectedChild(child)
        setGuardianName(child.guardian ? `${child.guardian.firstName} ${child.guardian.lastName}` : '')
        setError('')
        setMode(isCheckedIn(child) ? 'CONFIRM_OUT' : 'CONFIRM_IN')
    }

    const handleConfirm = async () => {
        if (!selectedChild) return
        setLoading(true)
        setError('')

        const formData = new FormData()
        formData.append('childId', selectedChild.id)
        formData.append(mode === 'CONFIRM_IN' ? 'checkedInBy' : 'checkedOutBy', guardianName)

        const result = mode === 'CONFIRM_IN'
            ? await checkInChild(formData)
            : await checkOutChild(formData)

        setLoading(false)

        if (result.error) {
            setError(result.error)
        } else {
            setSuccessMsg(
                mode === 'CONFIRM_IN'
                    ? `${selectedChild.firstName} has been checked in! ✅`
                    : `${selectedChild.firstName} has been checked out. 👋`
            )
            setMode('SUCCESS')
            setTimeout(() => {
                setMode('SELECT')
                setSelectedChild(null)
                setSearch('')
                setSuccessMsg('')
            }, 3000)
        }
    }

    return (
        <main style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #457B9D 0%, #1D3557 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '40px 20px'
        }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '40px', color: 'white' }}>
                <div style={{ fontSize: '3rem', marginBottom: '8px' }}>🐴</div>
                <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800 }}>Child Check-In</h1>
                <p style={{ margin: '8px 0 0', opacity: 0.8 }}>Rocking Horse Childcare</p>
            </div>

            {/* Success Screen */}
            {mode === 'SUCCESS' && (
                <div className="card" style={{ width: '100%', maxWidth: '500px', textAlign: 'center', padding: '60px 40px' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '20px' }}>
                        {successMsg.includes('in!') ? '✅' : '👋'}
                    </div>
                    <h2 style={{ color: 'var(--color-secondary)', margin: '0 0 10px' }}>{successMsg}</h2>
                    <p style={{ color: '#888' }}>Returning to home screen...</p>
                </div>
            )}

            {/* Confirm Modal */}
            {(mode === 'CONFIRM_IN' || mode === 'CONFIRM_OUT') && selectedChild && (
                <div className="card" style={{ width: '100%', maxWidth: '480px' }}>
                    <h2 style={{ margin: '0 0 6px', color: mode === 'CONFIRM_IN' ? 'var(--color-success)' : 'var(--color-primary)' }}>
                        {mode === 'CONFIRM_IN' ? '✅ Check In' : '👋 Check Out'}
                    </h2>
                    <p style={{ margin: '0 0 24px', fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-dark)' }}>
                        {selectedChild.firstName} {selectedChild.lastName}
                        {selectedChild.classroom && (
                            <span style={{ fontSize: '0.85rem', fontWeight: 'normal', color: '#666', marginLeft: '8px' }}>
                                • {selectedChild.classroom}
                            </span>
                        )}
                    </p>

                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', fontSize: '0.9rem' }}>
                        {mode === 'CONFIRM_IN' ? 'Dropping off (Guardian Name)' : 'Picking up (Guardian Name)'}
                    </label>
                    <input
                        className="input"
                        value={guardianName}
                        onChange={e => setGuardianName(e.target.value)}
                        placeholder="Guardian name"
                        style={{ marginBottom: '20px' }}
                    />

                    {error && <p style={{ color: 'red', marginBottom: '12px' }}>{error}</p>}

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={() => { setMode('SELECT'); setSelectedChild(null) }}
                            className="btn"
                            style={{ flex: 1, background: '#eee', color: '#333' }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={loading || !guardianName.trim()}
                            className={`btn ${mode === 'CONFIRM_IN' ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ flex: 2 }}
                        >
                            {loading ? '...' : (mode === 'CONFIRM_IN' ? 'Confirm Check-In' : 'Confirm Check-Out')}
                        </button>
                    </div>
                </div>
            )}

            {/* Child List */}
            {mode === 'SELECT' && (
                <div style={{ width: '100%', maxWidth: '600px' }}>
                    <input
                        className="input"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="🔍 Search by name or classroom…"
                        style={{ marginBottom: '20px', fontSize: '1.1rem' }}
                        autoFocus
                    />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {filtered.length === 0 && (
                            <div className="card" style={{ textAlign: 'center', color: '#888', padding: '40px' }}>
                                No children found.
                            </div>
                        )}
                        {filtered.map(child => {
                            const checkedIn = isCheckedIn(child)
                            return (
                                <button
                                    key={child.id}
                                    onClick={() => handleSelect(child)}
                                    style={{
                                        background: 'white',
                                        border: `2px solid ${checkedIn ? '#06D6A0' : '#e0e0e0'}`,
                                        borderRadius: '12px',
                                        padding: '16px 20px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        textAlign: 'left',
                                        transition: 'all 0.15s ease',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                                    }}
                                >
                                    <div>
                                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#1D3557' }}>
                                            {child.firstName} {child.lastName}
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '2px' }}>
                                            {child.classroom || 'No classroom'} · Guardian: {child.guardian ? `${child.guardian.firstName} ${child.guardian.lastName}` : 'N/A'}
                                        </div>
                                    </div>
                                    <div style={{
                                        padding: '6px 14px',
                                        borderRadius: '999px',
                                        fontSize: '0.8rem',
                                        fontWeight: 'bold',
                                        background: checkedIn ? '#06D6A0' : '#f0f0f0',
                                        color: checkedIn ? 'white' : '#888'
                                    }}>
                                        {checkedIn ? 'Here ✓' : 'Not In'}
                                    </div>
                                </button>
                            )
                        })}
                    </div>

                    <div style={{ textAlign: 'center', marginTop: '30px' }}>
                        <Link href="/" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>
                            ← Back to Staff Login
                        </Link>
                    </div>
                </div>
            )}
        </main>
    )
}
