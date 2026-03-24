'use client'

import { getRoles, createRole, updateRole, deleteRole } from "@/app/actions/roles"
import { useState, useEffect } from "react"
import Link from "next/link"

interface Role {
    id: string
    name: string
    description: string | null
    defaultRate: number | null
}

export default function RolesClient() {
    const [roles, setRoles] = useState<Role[]>([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingRole, setEditingRole] = useState<Role | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => { fetchRoles() }, [])

    const fetchRoles = async () => {
        setIsLoading(true)
        try {
            const data = await getRoles()
            setRoles(data)
        } catch (error) {
            console.error("Failed to fetch roles", error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleOpenModal = (role?: Role) => {
        setEditingRole(role || null)
        setIsModalOpen(true)
    }

    const handleCloseModal = () => {
        setIsModalOpen(false)
        setEditingRole(null)
    }

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this role?")) {
            const result = await deleteRole(id)
            if (result.success) fetchRoles()
            else alert("Failed to delete role")
        }
    }

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ color: 'var(--color-primary)' }}>Manage Roles</h1>
                <div style={{ display: 'flex', gap: '20px' }}>
                    <button onClick={() => handleOpenModal()} className="btn btn-primary">Add New Role</button>
                    <Link href="/admin" className="btn">Back to Dashboard</Link>
                </div>
            </header>

            <div className="card">
                {isLoading ? (
                    <p>Loading roles...</p>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                                <th style={{ padding: '10px' }}>Name</th>
                                <th style={{ padding: '10px' }}>Default Pay Rate</th>
                                <th style={{ padding: '10px' }}>Description</th>
                                <th style={{ padding: '10px', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {roles.map(role => (
                                <tr key={role.id} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{role.name}</td>
                                    <td style={{ padding: '10px' }}>
                                        {role.defaultRate ? `$${role.defaultRate.toFixed(2)}` : '-'}
                                    </td>
                                    <td style={{ padding: '10px', color: '#666' }}>{role.description || '-'}</td>
                                    <td style={{ padding: '10px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                        <button onClick={() => handleOpenModal(role)} className="btn" style={{ fontSize: '0.9em', padding: '5px 10px' }}>Edit</button>
                                        <button onClick={() => handleDelete(role.id)} className="btn" style={{ fontSize: '0.9em', padding: '5px 10px', backgroundColor: '#fee2e2', color: '#991b1b', borderColor: '#fecaca' }}>Delete</button>
                                    </td>
                                </tr>
                            ))}
                            {roles.length === 0 && (
                                <tr><td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: '#666' }}>No roles found. Create one to get started.</td></tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {isModalOpen && (
                <RoleModal role={editingRole} onClose={handleCloseModal} onSuccess={() => { handleCloseModal(); fetchRoles() }} />
            )}
        </div>
    )
}

function RoleModal({ role, onClose, onSuccess }: { role: Role | null, onClose: () => void, onSuccess: () => void }) {
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        const result = role ? await updateRole(role.id, formData) : await createRole(formData)
        if (result.success) onSuccess()
        else alert(result.error || "Operation failed")
    }

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="card" style={{ width: '100%', maxWidth: '500px', margin: '20px' }}>
                <h2 style={{ marginTop: 0 }}>{role ? 'Edit Role' : 'New Role'}</h2>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Role Name</label>
                        <input name="name" defaultValue={role?.name} required className="input" style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Default Pay Rate ($)</label>
                        <input name="defaultRate" type="number" step="0.01" min="0" defaultValue={role?.defaultRate || ''} placeholder="Optional" style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Description</label>
                        <textarea name="description" defaultValue={role?.description || ''} rows={3} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontFamily: 'inherit' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                        <button type="button" onClick={onClose} className="btn" style={{ backgroundColor: '#ccc', color: '#333' }}>Cancel</button>
                        <button type="submit" className="btn btn-primary">{role ? 'Save Changes' : 'Create Role'}</button>
                    </div>
                </form>
            </div>
        </div>
    )
}
