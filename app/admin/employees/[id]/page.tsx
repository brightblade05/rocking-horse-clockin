import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { getEmployeeStats } from '@/lib/stats'
import { getOrgLocations } from '@/lib/data'
import Link from 'next/link'
import { updateEmployee, assignRoleRate } from '@/app/actions/admin-users'
import RoleAssignmentForm from './RoleAssignmentForm'
import PtoManagement from './PtoManagement'
import EditEmployeeForm from './EditEmployeeForm'

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const currentUser = await requireAdmin()
    const { id } = await params

    const employee = await prisma.user.findUnique({
        where: { id },
        include: {
            location: true,
            userRoles: { include: { role: true } },
            punches: { orderBy: { timestamp: 'desc' }, take: 30, include: { role: true } }
        }
    })

    if (!employee || employee.organizationId !== currentUser.organizationId) return <div>Employee not found</div>

    const stats = await getEmployeeStats(id)
    const allRoles = await prisma.role.findMany({ where: { organizationId: currentUser.organizationId } })
    const locations = await getOrgLocations(currentUser.organizationId)

    return (
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px' }}>
            <header style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <Link href="/admin/employees" style={{ color: '#888', fontSize: '0.9rem' }}>← Employees</Link>
                    <h1 style={{ color: 'var(--color-primary)', margin: '4px 0 0' }}>{employee.name}</h1>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    {employee.isAdmin && <span style={{ background: 'purple', color: 'white', padding: '4px 10px', borderRadius: '6px', fontSize: '0.85rem' }}>ADMIN</span>}
                    <span style={{ background: employee.isActive ? '#e8f5e9' : '#ffebee', color: employee.isActive ? 'green' : 'red', padding: '4px 10px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                        {employee.isActive ? 'Active' : 'Inactive'}
                    </span>
                </div>
            </header>

            {/* KPI CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '30px' }}>
                <div className="card" style={{ textAlign: 'center' }}>
                    <h3 style={{ color: '#666', fontSize: '0.85rem', margin: '0 0 8px' }}>Weekly Hours</h3>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-primary)', margin: 0 }}>{stats.weeklyHours} hrs</p>
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                    <h3 style={{ color: '#666', fontSize: '0.85rem', margin: '0 0 8px' }}>Schedule Exceptions</h3>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold', color: stats.exceptionsCount > 0 ? 'orange' : 'green', margin: 0 }}>{stats.exceptionsCount}</p>
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                    <h3 style={{ color: '#666', fontSize: '0.85rem', margin: '0 0 8px' }}>Current Status</h3>
                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>{stats.lastActive}</p>
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                    <h3 style={{ color: '#666', fontSize: '0.85rem', margin: '0 0 8px' }}>PTO Balance</h3>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-secondary)', margin: 0 }}>{employee.ptoBalance.toFixed(1)} hrs</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                {/* EDIT PROFILE */}
                <div className="card">
                    <h2 style={{ margin: '0 0 16px' }}>Edit Profile</h2>
                    <EditEmployeeForm employee={employee as any} locations={locations} />
                </div>

                {/* ROLE ASSIGNMENTS */}
                <div className="card">
                    <h2 style={{ margin: '0 0 8px' }}>Role Assignments</h2>
                    <p style={{ fontSize: '0.9em', color: '#666', marginBottom: '16px' }}>Override base rate for specific duties.</p>
                    <ul style={{ listStyle: 'none', padding: 0, marginBottom: '20px' }}>
                        {employee.userRoles.map(ur => (
                            <li key={ur.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #eee' }}>
                                <span>{ur.role.name}</span>
                                <b>${ur.rate.toFixed(2)}/hr</b>
                            </li>
                        ))}
                        {employee.userRoles.length === 0 && <li style={{ color: '#999' }}>No special roles assigned.</li>}
                    </ul>
                    <RoleAssignmentForm userId={employee.id} roles={allRoles} />
                </div>
            </div>

            {/* PTO MANAGEMENT */}
            <div style={{ marginBottom: '24px' }}>
                <PtoManagement userId={employee.id} currentBalance={employee.ptoBalance} currentRate={employee.ptoRate} />
            </div>

            {/* RECENT PUNCH HISTORY */}
            <div className="card">
                <h2 style={{ margin: '0 0 16px', fontSize: '1.1rem' }}>Recent Punch History (last 30)</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #eee', color: '#888' }}>
                            <th style={{ padding: '10px', textAlign: 'left' }}>Date</th>
                            <th style={{ padding: '10px', textAlign: 'left' }}>Time</th>
                            <th style={{ padding: '10px', textAlign: 'left' }}>Type</th>
                            <th style={{ padding: '10px', textAlign: 'left' }}>Role</th>
                            <th style={{ padding: '10px', textAlign: 'left' }}>Note</th>
                        </tr>
                    </thead>
                    <tbody>
                        {employee.punches.length === 0 && <tr><td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: '#aaa' }}>No punch records.</td></tr>}
                        {employee.punches.map(p => (
                            <tr key={p.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                                <td style={{ padding: '10px', fontWeight: 500 }}>{new Date(p.timestamp).toLocaleDateString()}</td>
                                <td style={{ padding: '10px' }}>{new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                <td style={{ padding: '10px' }}>
                                    <span style={{ padding: '3px 8px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 'bold', background: p.type === 'IN' ? '#e8f5e9' : '#ffebee', color: p.type === 'IN' ? 'green' : 'red' }}>
                                        {p.type}
                                    </span>
                                </td>
                                <td style={{ padding: '10px', color: '#555' }}>{p.role?.name || 'General'}</td>
                                <td style={{ padding: '10px', color: '#888', fontSize: '0.85rem' }}>{p.note || ''}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
