'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getChildrenByGuardianPin, checkInChild, checkOutChild } from '@/app/actions/children'
import { useIdleTimeout } from '@/app/hooks/useIdleTimeout'

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

    // Multi-select state
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [selectedActionChildren, setSelectedActionChildren] = useState<Child[]>([])
    const [action, setAction] = useState<'IN' | 'OUT'>('IN')
    const [successMsg, setSuccessMsg] = useState('')

    const isCheckedIn = (c: Child) => c.attendance.length > 0 && !c.attendance[0].checkOut

    // ── KEYBOARD SUPPORT ───────────────────────────────────────
    useEffect(() => {
        if (screen !== 'PIN') return
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key >= '0' && e.key <= '9') {
                setPin(p => (p.length < 4 ? p + e.key : p))
            } else if (e.key === 'Backspace' || e.key === 'Delete') {
                setPin(p => p.slice(0, -1))
            } else if (e.key === 'Enter') {
                if (pin.length === 4 && !loading) {
                    // Slight delay to ensure state caught up, though effect closure might be stale.
                    // React 18 batches this well enough, but we should rely on a direct effect.
                }
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [screen, pin, loading])

    // Auto-trigger when PIN hits 4 digits
    useEffect(() => {
        if (screen === 'PIN' && pin.length === 4 && !loading) {
            handlePinSubmit()
        }
    }, [pin])

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
            // Auto-select all children to save time
            setSelectedIds(res.children.map(c => c.id))
            setScreen('CHILDREN')
        }
    }

    // ── SELECT CHILD ACTION ────────────────────────────────────
    const toggleChildSelection = (childId: string) => {
        setSelectedIds(prev =>
            prev.includes(childId) ? prev.filter(id => id !== childId) : [...prev, childId]
        )
    }

    const handleMultiAction = (act: 'IN' | 'OUT') => {
        const eligible = children.filter(c => selectedIds.includes(c.id) && (act === 'IN' ? !isCheckedIn(c) : isCheckedIn(c)))
        if (eligible.length === 0) {
            alert(`No selected children are eligible to be checked ${act.toLowerCase()}.`)
            return
        }
        setSelectedActionChildren(eligible)
        setAction(act)
        setScreen('CONFIRM')
    }

    // ── CONFIRM ────────────────────────────────────────────────
    const handleConfirmMulti = async () => {
        if (selectedActionChildren.length === 0 || !guardian) return
        setLoading(true)

        let hasError = false
        const successfulIds: string[] = []

        for (const child of selectedActionChildren) {
            const fd = new FormData()
            fd.append('childId', child.id)
            fd.append(action === 'IN' ? 'checkedInBy' : 'checkedOutBy', `${guardian.firstName} ${guardian.lastName}`)

            const res = action === 'IN' ? await checkInChild(fd) : await checkOutChild(fd)
            if ('error' in res && res.error) {
                setPinError(res.error)
                hasError = true
            } else {
                successfulIds.push(child.id)
            }
        }

        setLoading(false)

        if (hasError && successfulIds.length === 0) {
            setScreen('CHILDREN')
        } else {
            const emoji = action === 'IN' ? '✅' : '👋'
            const count = successfulIds.length
            setSuccessMsg(`${emoji} ${count} ${count === 1 ? 'child' : 'children'} ${action === 'IN' ? 'checked in!' : 'checked out.'}`)
            
            setScreen('SUCCESS')
            // AUTO-RESET to PIN pad after completion
            setTimeout(() => { setSuccessMsg(''); fullReset() }, 3000)
        }
    }

    // ── RESET ──────────────────────────────────────────────────
    const fullReset = () => {
        setPin(''); setGuardian(null); setChildren([])
        setSelectedIds([]); setSelectedActionChildren([]); setPinError(''); setScreen('PIN')
    }

    useIdleTimeout(() => {
        if (screen !== 'PIN') fullReset()
    }, 60000)

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
                    <p style={{ margin: '0 0 20px', color: '#888', fontSize: '0.9rem' }}>Enter your 4-digit PIN using the keypad or your keyboard.</p>

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
                            <div style={{ opacity: 0.75, fontSize: '0.9rem' }}>Select children to check in or out.</div>
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

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {children.map(child => {
                            const checkedIn = isCheckedIn(child)
                            const isSelected = selectedIds.includes(child.id)
                            return (
                                <div key={child.id} 
                                    onClick={() => toggleChildSelection(child.id)}
                                    style={{
                                    background: isSelected ? '#f8fbff' : 'white',
                                    borderRadius: '14px',
                                    padding: '16px 20px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    border: `2px solid ${isSelected ? 'var(--color-primary)' : '#e8e8e8'}`,
                                    boxShadow: isSelected ? '0 4px 14px rgba(69, 123, 157, 0.2)' : '0 2px 10px rgba(0,0,0,0.1)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        {/* Checkbox circle UI */}
                                        <div style={{
                                            width: '28px', height: '28px', borderRadius: '50%',
                                            border: `2px solid ${isSelected ? 'var(--color-primary)' : '#ccc'}`,
                                            background: isSelected ? 'var(--color-primary)' : 'transparent',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: 'white', fontWeight: 'bold'
                                        }}>
                                            {isSelected && '✓'}
                                        </div>

                                        <div>
                                            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1D3557' }}>
                                                {child.firstName} {child.lastName}
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '2px' }}>
                                                {child.classroom || 'No classroom'}
                                                {child.allergies && <span style={{ color: '#E63946', marginLeft: '8px' }}>⚠ {child.allergies}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <span style={{
                                            padding: '4px 10px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 'bold',
                                            background: checkedIn ? '#06D6A0' : '#f0f0f0',
                                            color: checkedIn ? 'white' : '#888'
                                        }}>
                                            {checkedIn ? 'Here ✓' : 'Not In'}
                                        </span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Action Toolbar */}
                    {children.length > 0 && (
                        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                            <button 
                                onClick={() => handleMultiAction('IN')} 
                                disabled={selectedIds.length === 0}
                                className="btn btn-primary" 
                                style={{ flex: 1, padding: '16px', fontSize: '1.1rem', opacity: selectedIds.length ? 1 : 0.5 }}>
                                Check In Selected
                            </button>
                            <button 
                                onClick={() => handleMultiAction('OUT')} 
                                disabled={selectedIds.length === 0}
                                className="btn btn-secondary" 
                                style={{ flex: 1, padding: '16px', fontSize: '1.1rem', opacity: selectedIds.length ? 1 : 0.5 }}>
                                Check Out Selected
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ── CONFIRM ── */}
            {screen === 'CONFIRM' && selectedActionChildren.length > 0 && (
                <div className="card" style={{ width: '420px', textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>{action === 'IN' ? '✅' : '👋'}</div>
                    <h2 style={{ color: action === 'IN' ? 'var(--color-success)' : 'var(--color-secondary)', margin: '0 0 16px' }}>
                        Confirm {action === 'IN' ? 'Check-In' : 'Check-Out'}
                    </h2>
                    
                    <div style={{ background: '#f8f9fa', borderRadius: '8px', padding: '16px', marginBottom: '24px', textAlign: 'left' }}>
                        <p style={{ margin: '0 0 10px', fontWeight: 'bold', color: '#666', borderBottom: '1px solid #ddd', paddingBottom: '6px' }}>
                            For the following {selectedActionChildren.length} children:
                        </p>
                        <ul style={{ margin: 0, paddingLeft: '20px', color: '#1D3557', fontWeight: 600, fontSize: '1.1rem' }}>
                            {selectedActionChildren.map(c => (
                                <li key={c.id} style={{ marginBottom: '6px' }}>
                                    {c.firstName} {c.lastName}
                                    {c.allergies && <span style={{ color: '#E63946', fontSize: '0.8rem', marginLeft: '6px', fontWeight: 'normal' }}>(⚠ Allergies)</span>}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => setScreen('CHILDREN')} className="btn" style={{ flex: 1, background: '#eee', color: '#333' }}>← Back</button>
                        <button onClick={handleConfirmMulti} disabled={loading} className={`btn ${action === 'IN' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 2 }}>
                            {loading ? 'Processing…' : (action === 'IN' ? 'Yes, Check In' : 'Yes, Check Out')}
                        </button>
                    </div>
                </div>
            )}

            {/* ── SUCCESS (auto-returns) ── */}
            {screen === 'SUCCESS' && (
                <div className="card" style={{ width: '400px', textAlign: 'center', padding: '60px 40px' }}>
                    <div style={{ fontSize: '4rem' }}>{action === 'IN' ? '✅' : '👋'}</div>
                    <h2 style={{ color: 'var(--color-secondary)', margin: '16px 0 8px' }}>{successMsg}</h2>
                    <p style={{ color: '#888' }}>Returning to PIN pad…</p>
                </div>
            )}
        </main>
    )
}
