'use client'

import { useState } from 'react'
import Link from 'next/link'
import { getChildrenByGuardianPin, checkInChild, checkOutChild } from '@/app/actions/children'

type Child = {
    id: string
    firstName: string
    lastName: string
    classroom: string | null
    allergies: string | null
    attendance: { checkIn: Date; checkOut: Date | null }[]
}

type GuardianData = {
    firstName: string
    lastName: string
}


type Screen = 'PIN' | 'CHILDREN' | 'CONFIRM' | 'SUCCESS'

export default function GuardianCheckinClient({ orgSlug }: { orgSlug: string }) {
    const [screen, setScreen] = useState<Screen>('PIN')
    const [pin, setPin] = useState('')
    const [pinError, setPinError] = useState('')
    const [loading, setLoading] = useState(false)

    const [guardian, setGuardian] = useState<GuardianData | null>(null)
    const [children, setChildren] = useState<Child[]>([])

    const [selectedChild, setSelectedChild] = useState<Child | null>(null)
    const [action, setAction] = useState<'IN' | 'OUT'>('IN')
    const [successMsg, setSuccessMsg] = useState('')

    const isCheckedIn = (c: Child) => c.attendance.length > 0 && !c.attendance[0].checkOut

    // ── PIN ENTRY ──────────────────────────────────────────────
    const handleNumClick = (num: string) => {
        if (pin.length < 4) setPin(p => p + num)
    }

    const handlePinSubmit = async () => {
        if (pin.length < 4) return
        setLoading(true)
        setPinError('')
        const res = await getChildrenByGuardianPin(pin, orgSlug)
        setLoading(false)

        if ('error' in res) {
            setPinError(res.error ?? 'Invalid PIN')
            setPin('')
        } else {
            setGuardian(res.guardian)
            setChildren(res.children)
            setScreen('CHILDREN')
        }
    }

    // ── SELECT CHILD ACTION ────────────────────────────────────
    const handleChildSelect = (child: Child, act: 'IN' | 'OUT') => {
        setSelectedChild(child)
        setAction(act)
        setScreen('CONFIRM')
    }

    // ── CONFIRM ────────────────────────────────────────────────
    const handleConfirm = async () => {
        if (!selectedChild || !guardian) return
        setLoading(true)

        const fd = new FormData()
        fd.append('childId', selectedChild.id)
        fd.append(action === 'IN' ? 'checkedInBy' : 'checkedOutBy', `${guardian.firstName} ${guardian.lastName}`)


        const res = action === 'IN' ? await checkInChild(fd) : await checkOutChild(fd)
        setLoading(false)

        if ('error' in res && res.error) {
            setPinError(res.error)
            setScreen('CHILDREN')
        } else {
            const emoji = action === 'IN' ? '✅' : '👋'
            setSuccessMsg(`${emoji} ${selectedChild.firstName} ${action === 'IN' ? 'checked in!' : 'checked out.'}`)
            // Update local state so badge refreshes
            setChildren(prev => prev.map(c => {
                if (c.id !== selectedChild.id) return c
                if (action === 'IN') {
                    return { ...c, attendance: [{ checkIn: new Date(), checkOut: null }] }
                } else {
                    return { ...c, attendance: [{ ...c.attendance[0], checkOut: new Date() }] }
                }
            }))
            setScreen('SUCCESS')
            setTimeout(() => { setSuccessMsg(''); setScreen('CHILDREN') }, 2500)
        }
    }

    // ── RESET ──────────────────────────────────────────────────
    const fullReset = () => {
        setPin(''); setGuardian(null); setChildren([])
        setSelectedChild(null); setPinError(''); setScreen('PIN')
    }

    // ─────────────────────── RENDER ───────────────────────────
    return (
        <main style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #1D3557 0%, #457B9D 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '30px 20px',
            gap: '24px'
        }}>
            {/* Header */}
            <div style={{ textAlign: 'center', color: 'white' }}>
                <div style={{ fontSize: '3rem' }}>🐴</div>
                <h1 style={{ margin: '4px 0 0', fontSize: '1.8rem', fontWeight: 800 }}>Child Check-In</h1>
            </div>

            {/* ── PIN SCREEN ── */}
            {screen === 'PIN' && (
                <div className="card" style={{ width: '360px', textAlign: 'center' }}>
                    <h2 style={{ margin: '0 0 6px', color: 'var(--color-secondary)' }}>Guardian PIN</h2>
                    <p style={{ margin: '0 0 20px', color: '#888', fontSize: '0.9rem' }}>Enter your 4-digit PIN to see your children.</p>

                    {/* PIN display */}
                    <div style={{
                        fontSize: '2.2rem', letterSpacing: '12px', padding: '12px',
                        border: `2px solid ${pinError ? 'red' : 'var(--color-gray)'}`,
                        borderRadius: '10px', marginBottom: '16px', minHeight: '60px'
                    }}>
                        {'●'.repeat(pin.length)}{'○'.repeat(4 - pin.length)}
                    </div>

                    {pinError && <p style={{ color: 'red', marginBottom: '12px', fontSize: '0.9rem' }}>{pinError}</p>}

                    {/* Numpad */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '14px' }}>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                            <button key={n} onClick={() => handleNumClick(String(n))} className="btn btn-secondary" style={{ fontSize: '1.4rem', padding: '18px' }}>{n}</button>
                        ))}
                        <button onClick={() => setPin('')} className="btn" style={{ background: '#eee', color: '#333', fontSize: '1.1rem' }}>CLR</button>
                        <button onClick={() => handleNumClick('0')} className="btn btn-secondary" style={{ fontSize: '1.4rem', padding: '18px' }}>0</button>
                        <button onClick={handlePinSubmit} disabled={loading || pin.length < 4} className="btn btn-primary" style={{ fontSize: '1.1rem' }}>
                            {loading ? '…' : 'GO'}
                        </button>
                    </div>
                    <Link href="/" style={{ color: '#aaa', fontSize: '0.85rem' }}>← Back</Link>
                </div>
            )}

            {/* ── CHILD LIST ── */}
            {screen === 'CHILDREN' && guardian && (
                <div style={{ width: '100%', maxWidth: '540px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{ color: 'white' }}>
                            <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>Welcome, {guardian.firstName}!</div>

                            <div style={{ opacity: 0.75, fontSize: '0.9rem' }}>Select a child to check in or out.</div>
                        </div>
                        <button onClick={fullReset} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                            Lock 🔒
                        </button>
                    </div>

                    {children.length === 0 && (
                        <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                            No children linked to this PIN. Ask an administrator to link your children.
                        </div>
                    )}

                    {successMsg && (
                        <div style={{ background: 'rgba(6,214,160,0.2)', border: '1px solid #06D6A0', borderRadius: '12px', padding: '14px 20px', color: 'white', fontWeight: 'bold', marginBottom: '12px', textAlign: 'center', fontSize: '1.1rem' }}>
                            {successMsg}
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {children.map(child => {
                            const checkedIn = isCheckedIn(child)
                            return (
                                <div key={child.id} style={{
                                    background: 'white',
                                    borderRadius: '14px',
                                    padding: '16px 20px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    border: `2px solid ${checkedIn ? '#06D6A0' : '#e8e8e8'}`,
                                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1D3557' }}>
                                            {child.firstName} {child.lastName}
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '2px' }}>
                                            {child.classroom || 'No classroom'}
                                            {child.allergies && <span style={{ color: '#E63946', marginLeft: '8px' }}>⚠ {child.allergies}</span>}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <span style={{
                                            padding: '4px 10px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 'bold',
                                            background: checkedIn ? '#06D6A0' : '#f0f0f0',
                                            color: checkedIn ? 'white' : '#888'
                                        }}>
                                            {checkedIn ? 'Here ✓' : 'Not In'}
                                        </span>
                                        {!checkedIn
                                            ? <button onClick={() => handleChildSelect(child, 'IN')} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>Check In</button>
                                            : <button onClick={() => handleChildSelect(child, 'OUT')} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>Check Out</button>
                                        }
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* ── CONFIRM ── */}
            {screen === 'CONFIRM' && selectedChild && (
                <div className="card" style={{ width: '420px', textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>{action === 'IN' ? '✅' : '👋'}</div>
                    <h2 style={{ color: action === 'IN' ? 'var(--color-success)' : 'var(--color-secondary)', margin: '0 0 6px' }}>
                        {action === 'IN' ? 'Confirm Check-In' : 'Confirm Check-Out'}
                    </h2>
                    <p style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#1D3557', margin: '0 0 6px' }}>
                        {selectedChild.firstName} {selectedChild.lastName}
                    </p>
                    {selectedChild.classroom && <p style={{ color: '#888', margin: '0 0 24px', fontSize: '0.9rem' }}>{selectedChild.classroom}</p>}
                    {selectedChild.allergies && (
                        <div style={{ background: '#fff5f5', border: '1px solid #E63946', borderRadius: '8px', padding: '10px', marginBottom: '20px', color: '#E63946', fontSize: '0.9rem' }}>
                            ⚠ Allergy Alert: {selectedChild.allergies}
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => setScreen('CHILDREN')} className="btn" style={{ flex: 1, background: '#eee', color: '#333' }}>← Back</button>
                        <button onClick={handleConfirm} disabled={loading} className={`btn ${action === 'IN' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 2 }}>
                            {loading ? '…' : (action === 'IN' ? 'Yes, Check In' : 'Yes, Check Out')}
                        </button>
                    </div>
                </div>
            )}

            {/* ── SUCCESS (auto-returns) ── */}
            {screen === 'SUCCESS' && (
                <div className="card" style={{ width: '400px', textAlign: 'center', padding: '60px 40px' }}>
                    <div style={{ fontSize: '4rem' }}>{action === 'IN' ? '✅' : '👋'}</div>
                    <h2 style={{ color: 'var(--color-secondary)', margin: '16px 0 8px' }}>{successMsg}</h2>
                    <p style={{ color: '#888' }}>Returning to your children…</p>
                </div>
            )}
        </main>
    )
}
