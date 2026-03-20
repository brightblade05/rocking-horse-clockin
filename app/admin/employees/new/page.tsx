'use client'

import { createEmployee } from '@/app/actions/admin-users'
import { useState, useEffect } from 'react'
import Link from 'next/link'

type Location = { id: string; name: string }

export default function NewEmployeePage() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [generatedPin, setGeneratedPin] = useState('')
    const [payType, setPayType] = useState('HOURLY')
    const [adminRole, setAdminRole] = useState('NONE')
    const [locations, setLocations] = useState<Location[]>([])

    useEffect(() => {
        setGeneratedPin(Math.floor(1000 + Math.random() * 9000).toString())
        // Fetch locations for current org
        fetch('/api/locations')
            .then(r => r.json())
            .then(data => setLocations(data))
            .catch(() => {})
    }, [])

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        const formData = new FormData(e.currentTarget)

        const res = await createEmployee(formData)
        if (res?.error) {
            setError(res.error)
            setLoading(false)
        } else {
            window.location.href = '/admin/employees'
        }
    }

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
            <header style={{ marginBottom: '30px' }}>
                <h1 style={{ color: 'var(--color-primary)' }}>Add New Employee</h1>
            </header>

            <div className="card">
                {error && <p style={{ color: 'red', marginBottom: '15px' }}>{error}</p>}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Full Name</label>
                        <input name="name" type="text" className="input" required placeholder="e.g. John Doe" />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>PIN Code (4 digits)</label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <input
                                    name="pin"
                                    type="text"
                                    maxLength={4}
                                    className="input"
                                    required
                                    value={generatedPin}
                                    onChange={(e) => setGeneratedPin(e.target.value)}
                                />
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setGeneratedPin(Math.floor(1000 + Math.random() * 9000).toString())}
                                    style={{ padding: '0 15px', fontSize: '1.2rem' }}
                                    title="Generate New PIN"
                                >
                                    ↻
                                </button>
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Pay Type</label>
                            <select name="payType" className="input" value={payType} onChange={(e) => setPayType(e.target.value)}>
                                <option value="HOURLY">Hourly</option>
                                <option value="SALARY">Flat Yearly Salary</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        {payType === 'HOURLY' ? (
                            <div>
                                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Base Hourly Rate ($)</label>
                                <input name="baseRate" type="number" step="0.01" className="input" required placeholder="15.00" />
                            </div>
                        ) : (
                            <div>
                                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Yearly Salary ($)</label>
                                <input name="yearlySalary" type="number" step="1" className="input" required placeholder="50000" />
                            </div>
                        )}
                        <div>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Email (for admin login)</label>
                            <input name="email" type="email" className="input" placeholder="user@example.com" />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '10px' }}>
                        <div>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Portal Access Role</label>
                            <select name="adminRole" className="input" value={adminRole} onChange={e => setAdminRole(e.target.value)}>
                                <option value="NONE">None (Kiosk Only)</option>
                                <option value="SUPERADMIN">Superadmin</option>
                                <option value="MANAGER">Manager</option>
                                <option value="FRONT_DESK">Front Desk</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Location / Campus</label>
                            <select name="locationId" className="input" defaultValue="">
                                <option value="">All Locations / None</option>
                                {locations.map(loc => (
                                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {adminRole !== 'NONE' && (
                        <div>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Admin Password</label>
                            <input name="password" type="password" className="input" required placeholder="Set admin login password" />
                            <p style={{ fontSize: '0.8em', color: '#666', marginTop: '4px' }}>Required for portal access.</p>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
                        <Link href="/admin/employees" className="btn" style={{ backgroundColor: '#ccc', textAlign: 'center' }}>Cancel</Link>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Employee'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
