'use client'

import { useState } from 'react'
import Link from 'next/link'
import { exportEmployeesCsv, importEmployeesCsv } from '@/app/actions/admin-users'
import { toggleEmployeeStatus } from '@/app/actions/admin-users'

type Employee = {
    id: string
    name: string
    pin: string
    baseRate: number
    isActive: boolean
    isAdmin: boolean
    employmentType: string
    phone: string | null
    adminRole: string
    location: string | null
    _count: { punches: number }
}

type Props = { employees: Employee[] }

export default function EmployeeListClient({ employees }: Props) {
    const [importMsg, setImportMsg] = useState('')

    const handleExport = async () => {
        const csv = await exportEmployeesCsv()
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = url
        a.download = `employee-roster-${new Date().toISOString().split('T')[0]}.csv`
        a.click(); URL.revokeObjectURL(url)
    }

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return
        const text = await file.text()
        const res = await importEmployeesCsv(text)
        setImportMsg(`Import complete: ${res.created} added, ${res.errors} skipped.`)
        e.target.value = ''
    }

    const handleToggle = async (id: string, isActive: boolean) => {
        await toggleEmployeeStatus(id, !isActive)
    }

    return (
        <>
            {/* CSV Toolbar */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
                <button className="btn btn-secondary" onClick={handleExport} style={{ fontSize: '0.9rem', padding: '8px 16px' }}>⬇ Download Roster CSV</button>
                <label className="btn" style={{ fontSize: '0.9rem', padding: '8px 16px', background: '#eef2ff', color: '#457B9D', cursor: 'pointer' }}>
                    ⬆ Upload CSV
                    <input type="file" accept=".csv" onChange={handleImport} style={{ display: 'none' }} />
                </label>
                {importMsg && <span style={{ fontSize: '0.85rem', color: 'green' }}>{importMsg}</span>}
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee', background: '#f9f9f9', color: '#666', fontSize: '0.85rem' }}>
                            <th style={{ padding: '12px 16px' }}>Name</th>
                            <th style={{ padding: '12px 16px' }}>Type</th>
                            <th style={{ padding: '12px 16px' }}>Location / Role</th>
                            <th style={{ padding: '12px 16px' }}>Phone</th>
                            <th style={{ padding: '12px 16px' }}>Base Rate</th>
                            <th style={{ padding: '12px 16px' }}>Punches</th>
                            <th style={{ padding: '12px 16px' }}>Status</th>
                            <th style={{ padding: '12px 16px' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {employees.map(emp => (
                            <tr key={emp.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>
                                    <Link href={`/admin/employees/${emp.id}`} style={{ color: 'var(--color-secondary)', textDecoration: 'underline' }}>
                                        {emp.name}
                                    </Link>
                                    {emp.isAdmin && <span style={{ marginLeft: '6px', fontSize: '0.75em', background: 'purple', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>ADMIN</span>}
                                </td>
                                <td style={{ padding: '12px 16px', color: '#666', fontSize: '0.9rem' }}>{emp.employmentType.replace('_', '-')}</td>
                                <td style={{ padding: '12px 16px', color: '#666', fontSize: '0.85rem' }}>
                                    <div style={{ fontWeight: 'bold' }}>{emp.location || 'All Campus'}</div>
                                    <div style={{ fontSize: '0.8em', color: '#999' }}>{emp.adminRole}</div>
                                </td>
                                <td style={{ padding: '12px 16px', color: '#888', fontSize: '0.9rem' }}>{emp.phone || '—'}</td>
                                <td style={{ padding: '12px 16px' }}>${emp.baseRate.toFixed(2)}</td>
                                <td style={{ padding: '12px 16px', color: '#888' }}>{emp._count.punches}</td>
                                <td style={{ padding: '12px 16px' }}>
                                    <span style={{ color: emp.isActive ? 'green' : 'red', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                        {emp.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td style={{ padding: '12px 16px' }}>
                                    <button
                                        onClick={() => handleToggle(emp.id, emp.isActive)}
                                        className="btn"
                                        style={{ padding: '4px 10px', fontSize: '0.8em', background: emp.isActive ? '#ffebee' : '#e8f5e9', color: emp.isActive ? 'red' : 'green' }}
                                    >
                                        {emp.isActive ? 'Deactivate' : 'Activate'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    )
}
