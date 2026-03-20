'use client'

import { assignRoleRate } from '@/app/actions/admin-users'
import { useState } from 'react'

interface Role {
    id: string
    name: string
    defaultRate: number | null
}

export default function RoleAssignmentForm({ userId, roles }: { userId: string, roles: Role[] }) {
    const [selectedRole, setSelectedRole] = useState(roles[0]?.id || '')
    const [rate, setRate] = useState(roles[0]?.defaultRate?.toString() || '')

    const handleRoleChange = (roleId: string) => {
        setSelectedRole(roleId)
        const role = roles.find(r => r.id === roleId)
        if (role?.defaultRate) {
            setRate(role.defaultRate.toString())
        } else {
            setRate('')
        }
    }

    // Initialize state if roles exist
    useState(() => {
        if (selectedRole) {
            handleRoleChange(selectedRole)
        }
    })

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        await assignRoleRate(formData)
        // Reset or notify? RevalidatePath on server will refresh the page.
        // We might want to clear inputs?
        // simple reload for now or let server validation handle it.
    }

    if (roles.length === 0) return <p>No roles defined.</p>

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', paddingTop: '10px', borderTop: '1px solid #eee' }}>
            <input type="hidden" name="userId" value={userId} />
            <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.8em' }}>Role</label>
                <select
                    name="roleId"
                    className="input"
                    style={{ width: '100%' }}
                    value={selectedRole}
                    onChange={(e) => handleRoleChange(e.target.value)}
                >
                    {roles.map(r => (
                        <option key={r.id} value={r.id}>
                            {r.name} {r.defaultRate ? `($${r.defaultRate.toFixed(2)})` : ''}
                        </option>
                    ))}
                </select>
            </div>
            <div style={{ width: '100px' }}>
                <label style={{ fontSize: '0.8em' }}>Rate ($)</label>
                <input
                    name="rate"
                    type="number"
                    step="0.01"
                    className="input"
                    style={{ width: '100%' }}
                    placeholder="Rate"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                />
            </div>
            <button type="submit" className="btn btn-secondary" style={{ padding: '10px' }}>Add</button>
        </form>
    )
}
