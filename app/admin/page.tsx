import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

async function getAdminData(organizationId: string, locationId: string | null, adminRole: string) {
    const where: any = {
        isActive: true,
        organizationId,
    }
    if (adminRole !== 'SUPERADMIN' && locationId) {
        where.locationId = locationId
    }

    const startOfWeek = new Date()
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    const users = await prisma.user.findMany({
        where,
        include: {
            location: true,
            punches: {
                where: {
                    timestamp: {
                        gte: startOfWeek
                    }
                },
                orderBy: { timestamp: 'desc' },
                include: { role: true }
            },
            schedules: {
                where: {
                    date: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0)),
                        lte: new Date(new Date().setHours(23, 59, 59, 999))
                    }
                }
            }
        },
        orderBy: { name: 'asc' }
    })

    return users
}

export default async function AdminDashboard() {
    const currentUser = await requireAdmin()

    const employees = await getAdminData(
        currentUser.organizationId,
        currentUser.locationId,
        currentUser.adminRole
    )

    const todayStart = new Date(new Date().setHours(0, 0, 0, 0))

    const clockedIn = employees.filter(u => {
        const todayPunches = u.punches.filter(p => p.timestamp >= todayStart)
        return todayPunches.length > 0 && todayPunches[0].type === 'IN'
    })

    const absent = employees.filter(u => {
        const todayPunches = u.punches.filter(p => p.timestamp >= todayStart)
        return u.schedules.length > 0 && todayPunches.length === 0
    })

    const overtimeAlerts = employees.map(u => {
        let totalMs = 0
        let currentIn = null
        // Punches are sorted desc, so iterate backwards to process in chronological order
        for (let i = u.punches.length - 1; i >= 0; i--) {
            const p = u.punches[i]
            if (p.type === 'IN') currentIn = p.timestamp
            else if (p.type === 'OUT' && currentIn) {
                totalMs += p.timestamp.getTime() - currentIn.getTime()
                currentIn = null
            }
        }
        if (currentIn) {
            totalMs += new Date().getTime() - currentIn.getTime()
        }
        const hours = totalMs / (1000 * 60 * 60)
        return { ...u, weekHours: hours }
    }).filter(u => u.weekHours >= 35)

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <header style={{ marginBottom: '40px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
                <div>
                    <h1 style={{ color: 'var(--color-primary)', margin: 0 }}>Admin Dashboard</h1>
                    <p style={{ color: '#888', fontSize: '0.9rem', margin: '4px 0 0' }}>
                        {currentUser.organization?.name}
                        {currentUser.location ? ` — ${currentUser.location.name}` : ''}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <Link href="/admin/employees" className="btn btn-primary">Employees</Link>
                    <Link href="/admin/children" className="btn btn-secondary">👶 Children</Link>
                    <Link href="/admin/guardians" className="btn btn-secondary">👨‍👩‍👧 Guardians</Link>
                    <Link href="/admin/schedule" className="btn btn-secondary">Schedule</Link>
                    <Link href="/admin/roles" className="btn btn-secondary">Roles</Link>
                    <Link href="/admin/reports" className="btn btn-secondary">Reports</Link>
                    <form action={async () => { 'use server'; const { logout } = await import('@/app/actions/auth'); await logout() }}>
                        <button type="submit" className="btn" style={{ background: '#fee2e2', color: '#dc2626' }}>Logout</button>
                    </form>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>

                <section className="card">
                    <h2 style={{ color: 'var(--color-success)' }}>Clocked In ({clockedIn.length})</h2>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {clockedIn.length === 0 && <li>No one is here.</li>}
                        {clockedIn.map(u => {
                            const todayPunches = u.punches.filter(p => p.timestamp >= todayStart)
                            return (
                                <li key={u.id} style={{ padding: '10px 0', borderBottom: '1px solid #eee' }}>
                                    <strong>{u.name}</strong>
                                    {u.location && <span style={{ fontSize: '0.8em', color: '#999', marginLeft: '8px' }}>📍{u.location.name}</span>}
                                    <div style={{ fontSize: '0.9em', color: '#666' }}>
                                        {todayPunches[0].role?.name || 'General'} • Since {todayPunches[0].timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                </section>

                <section className="card">
                    <h2 style={{ color: 'var(--color-primary)' }}>Alerts / Absent</h2>
                    {absent.length === 0 && <p>All scheduled employees are here.</p>}
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {absent.map(u => (
                            <li key={u.id} style={{ padding: '10px 0', borderBottom: '1px solid #eee' }}>
                                <strong>{u.name}</strong>
                                <div style={{ fontSize: '0.9em', color: 'red' }}>
                                    Scheduled: {u.schedules[0].startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>

                <section className="card">
                    <h2 style={{ color: '#D97706' }}>Approaching Overtime</h2>
                    <p style={{ fontSize: '0.9em', color: '#666' }}>Employees &gt; 35 hours this week</p>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {overtimeAlerts.length === 0 && <li style={{ padding: '10px 0', color: '#666' }}>No alerts</li>}
                        {overtimeAlerts.map(u => (
                            <li key={u.id} style={{ padding: '10px 0', borderBottom: '1px solid #eee' }}>
                                <strong>{u.name}</strong>
                                <div style={{ fontSize: '0.9em', color: '#D97706', fontWeight: 'bold' }}>
                                    {u.weekHours.toFixed(2)} hours
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>

            </div>
        </div>
    )
}
