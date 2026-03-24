'use client'

import { useState } from 'react'
import { clockIn, clockOut, switchDuty } from '@/app/actions/punch'

type Props = {
    user: any
    currentPunch: any
    // schedule: any
    roles: any[]
    todayString: string
    orgSlug: string
}

export default function EmployeeDashboardClient({ user, currentPunch, roles, todayString, orgSlug }: Props) {

    const [loading, setLoading] = useState(false)
    const [modalMode, setModalMode] = useState<'NONE' | 'NOTE_IN' | 'NOTE_OUT' | 'SWITCH'>('NONE')
    const [noteMessage, setNoteMessage] = useState('')
    const [noteInput, setNoteInput] = useState('')
    const [selectedRole, setSelectedRole] = useState('')

    const handleClockIn = async (roleId?: string, note?: string) => {
        setLoading(true)
        const formData = new FormData()
        formData.append('userId', user.id)
        if (roleId) formData.append('roleId', roleId)
        if (note) formData.append('note', note)

        const res = await clockIn(formData)
        setLoading(false)

        if (res.status === 'NOTE_REQUIRED') {
            setNoteMessage(res.message!)
            setModalMode('NOTE_IN')
            setSelectedRole(roleId || '')
        } else {
            setModalMode('NONE')
        }
    }

    const handleClockOut = async (note?: string) => {
        setLoading(true)
        const formData = new FormData()
        formData.append('userId', user.id)
        if (note) formData.append('note', note)

        const res = await clockOut(formData)
        setLoading(false)

        if (res.status === 'NOTE_REQUIRED') {
            setNoteMessage(res.message!)
            setModalMode('NOTE_OUT')
        } else {
            setModalMode('NONE')
        }
    }

    const handleSwitchDuty = async (newRoleId: string) => {
        setLoading(true)
        const formData = new FormData()
        formData.append('userId', user.id)
        formData.append('newRoleId', newRoleId)

        await switchDuty(formData)
        setLoading(false)
        setModalMode('NONE')
    }

    const isClockedIn = !!currentPunch

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                <div>
                    <h1 style={{ margin: 0, color: 'var(--color-primary)' }}>Welcome, {user.name}</h1>
                    <p style={{ color: '#666' }}>{todayString}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <form action="/api/logout_temp" method="post" onSubmit={async (e) => {
                        e.preventDefault()
                        await import('@/app/actions/auth').then(m => m.logout())
                    }}>
                        <button type="submit" className="btn" style={{ fontSize: '0.8rem', padding: '8px 16px', background: '#eee' }}>Logout</button>
                    </form>
                </div>
            </header>

            <section className="card" style={{ textAlign: 'center', marginBottom: '30px' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>
                    Current Status:
                    <span style={{
                        color: isClockedIn ? 'var(--color-success)' : 'var(--color-dark)',
                        marginLeft: '10px',
                        fontWeight: 'bold'
                    }}>
                        {isClockedIn ? `CLOCKED IN (${currentPunch.role?.name || 'General'})` : 'OFF DUTY'}
                    </span>
                </h2>

                <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    {!isClockedIn ? (
                        <>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <p>Select a Duty to Start:</p>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    {roles.map(role => (
                                        <button
                                            key={role.id}
                                            onClick={() => handleClockIn(role.id)}
                                            disabled={loading}
                                            className="btn"
                                            style={{
                                                backgroundColor: role.name.includes('Bus') ? 'var(--color-accent)' : 'var(--color-secondary)',
                                                color: 'white',
                                                minWidth: '120px'
                                            }}
                                        >
                                            {role.name}
                                        </button>
                                    ))}
                                    {/* Fallback standard clock in if no role specific? */}
                                    {roles.length === 0 && (
                                        <button onClick={() => handleClockIn()} className="btn btn-primary">Clock In</button>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => setModalMode('SWITCH')}
                                className="btn btn-secondary"
                                disabled={loading}
                            >
                                Switch Duty / Room
                            </button>
                            <button
                                onClick={() => handleClockOut()}
                                className="btn btn-primary"
                                disabled={loading}
                            >
                                Clock Out / Break
                            </button>
                        </>
                    )}
                </div>
            </section>

            {/* MODALS */}
            {modalMode !== 'NONE' && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 100
                }}>
                    <div className="card" style={{ width: '400px', maxWidth: '90%' }}>
                        {modalMode === 'SWITCH' && (
                            <>
                                <h3>Switch Duty To:</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
                                    {roles.filter(r => r.id !== currentPunch?.roleId).map(role => (
                                        <button
                                            key={role.id}
                                            onClick={() => handleSwitchDuty(role.id)}
                                            className="btn btn-secondary"
                                        >
                                            {role.name}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={() => setModalMode('NONE')}
                                    style={{ marginTop: '20px', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                                >
                                    Cancel
                                </button>
                            </>
                        )}

                        {(modalMode === 'NOTE_IN' || modalMode === 'NOTE_OUT') && (
                            <>
                                <h3 style={{ color: 'var(--color-primary)' }}>Note Required</h3>
                                <p>{noteMessage}</p>
                                <textarea
                                    value={noteInput}
                                    onChange={e => setNoteInput(e.target.value)}
                                    placeholder="Reason for schedule deviation..."
                                    style={{ width: '100%', minHeight: '80px', margin: '20px 0', padding: '10px' }}
                                />
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        onClick={() => setModalMode('NONE')}
                                        className="btn"
                                        style={{ backgroundColor: '#ccc' }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (modalMode === 'NOTE_IN') handleClockIn(selectedRole, noteInput)
                                            else handleClockOut(noteInput)
                                        }}
                                        className="btn btn-primary"
                                        disabled={!noteInput.trim()}
                                    >
                                        Submit
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Schedule & Time Off Links */}
            <div style={{ marginTop: '40px', display: 'grid', gap: '20px', gridTemplateColumns: '1fr 1fr' }}>
                <div className="card">
                    <h3>My Schedule</h3>
                    <p style={{ color: '#888' }}>No schedule for today (Demo)</p>
                    <button className="btn" style={{ marginTop: '10px', border: '1px solid #ccc' }}>View Full Schedule</button>
                </div>
                <div className="card">
                    <h3>Time Off</h3>
                    <button className="btn" style={{ marginTop: '10px', border: '1px solid #ccc' }}>Request Time Off</button>
                </div>
            </div>
        </div>
    )
}
