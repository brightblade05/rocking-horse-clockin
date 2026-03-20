import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function ChildProfilePage({ params }: { params: Promise<{ id: string }> }) {
    await requireAdmin()
    const { id } = await params

    const child = await prisma.child.findUnique({
        where: { id },
        include: {
            guardian: true,
            attendance: {
                orderBy: { checkIn: 'desc' },
                take: 60
            }
        }
    })

    if (!child) return notFound()

    // Stats
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const thisWeekStart = new Date(today); thisWeekStart.setDate(today.getDate() - today.getDay())
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)

    const totalDays = child.attendance.filter(a => a.checkOut).length
    const presentToday = child.attendance.some(a => a.checkIn >= today && !a.checkOut)

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
            <header style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <Link href="/admin/children" style={{ color: '#888', fontSize: '0.9rem' }}>← Children</Link>
                    <h1 style={{ color: 'var(--color-secondary)', margin: '4px 0 0' }}>
                        {child.firstName} {child.lastName}
                        <span style={{ marginLeft: '10px', fontSize: '0.75rem', padding: '3px 10px', borderRadius: '999px', background: presentToday ? '#06D6A0' : '#eee', color: presentToday ? 'white' : '#888' }}>
                            {presentToday ? 'Here Today ✓' : 'Not In'}
                        </span>
                    </h1>
                </div>
                <Link href={`/admin/children/${id}/edit`} className="btn btn-secondary">Edit Profile</Link>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                {/* Profile Info */}
                <div className="card">
                    <h2 style={{ margin: '0 0 16px', fontSize: '1.1rem' }}>Profile</h2>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                        <tbody>
                            {[
                                ['Classroom', child.classroom || '—'],
                                ['Date of Birth', child.dateOfBirth ? new Date(child.dateOfBirth).toLocaleDateString() : '—'],
                                ['Enrolled', new Date(child.enrollDate).toLocaleDateString()],
                                ['Allergies', child.allergies || 'None noted'],
                                ['Notes', child.notes || '—'],
                            ].map(([label, value]) => (
                                <tr key={label} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                    <td style={{ padding: '10px 0', color: '#888', width: '40%' }}>{label}</td>
                                    <td style={{ padding: '10px 0', fontWeight: 500 }}>{value}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Guardian Info */}
                <div className="card">
                    <h2 style={{ margin: '0 0 16px', fontSize: '1.1rem' }}>Guardian & Emergency Contact</h2>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                        <tbody>
                            {[
                                ['Primary Guardian', child.guardian ? `${child.guardian.firstName} ${child.guardian.lastName} (PIN: ${child.guardian.pin})` : '—'],
                                ['Relationship', child.guardian?.relationshipToChild || '—'],
                                ['Phone', child.guardian?.phone || '—'],
                                ['Email', child.guardian?.email || '—'],
                                ['Address', child.guardian ? [child.guardian.address, child.guardian.city, child.guardian.state, child.guardian.zip].filter(Boolean).join(', ') : '—'],
                                ['Guardian 2', child.guardian?.guardian2FirstName ? `${child.guardian.guardian2FirstName} ${child.guardian.guardian2LastName || ''}` : '—'],
                                ['Guardian 2 Phone', child.guardian?.guardian2Phone || '—'],
                            ].map(([label, value]) => (
                                <tr key={label as string} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                    <td style={{ padding: '10px 0', color: '#888', width: '40%' }}>{label}</td>
                                    <td style={{ padding: '10px 0', fontWeight: 500 }}>
                                        {label === 'Primary Guardian' && child.guardian ? (
                                            <Link href={`/admin/guardians/${child.guardian.id}`} style={{ color: 'var(--color-secondary)', textDecoration: 'underline' }}>{value}</Link>
                                        ) : value}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                {[
                    { label: 'Total Days Attended', value: totalDays },
                    { label: 'Attendance Records', value: child.attendance.length },
                    { label: 'Status Today', value: presentToday ? 'Present' : 'Absent' },
                ].map(item => (
                    <div key={item.label} className="card" style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-secondary)' }}>{item.value}</div>
                        <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '4px' }}>{item.label}</div>
                    </div>
                ))}
            </div>

            {/* Attendance Log */}
            <div className="card">
                <h2 style={{ margin: '0 0 16px', fontSize: '1.1rem' }}>Attendance History (last 60 records)</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #eee', color: '#888' }}>
                            <th style={{ padding: '10px', textAlign: 'left' }}>Date</th>
                            <th style={{ padding: '10px', textAlign: 'left' }}>Check In</th>
                            <th style={{ padding: '10px', textAlign: 'left' }}>Dropped Off By</th>
                            <th style={{ padding: '10px', textAlign: 'left' }}>Check Out</th>
                            <th style={{ padding: '10px', textAlign: 'left' }}>Picked Up By</th>
                            <th style={{ padding: '10px', textAlign: 'right' }}>Duration</th>
                        </tr>
                    </thead>
                    <tbody>
                        {child.attendance.length === 0 && (
                            <tr><td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: '#aaa' }}>No attendance records yet.</td></tr>
                        )}
                        {child.attendance.map(a => {
                            const durationMs = a.checkOut ? new Date(a.checkOut).getTime() - new Date(a.checkIn).getTime() : null
                            const durationHrs = durationMs ? (durationMs / 3600000).toFixed(1) : null
                            return (
                                <tr key={a.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                                    <td style={{ padding: '10px', fontWeight: 500 }}>{new Date(a.checkIn).toLocaleDateString()}</td>
                                    <td style={{ padding: '10px' }}>{new Date(a.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                    <td style={{ padding: '10px', color: '#555' }}>{a.checkedInBy || '—'}</td>
                                    <td style={{ padding: '10px' }}>
                                        {a.checkOut ? new Date(a.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : <span style={{ color: '#06D6A0', fontWeight: 'bold' }}>Still Here</span>}
                                    </td>
                                    <td style={{ padding: '10px', color: '#555' }}>{a.checkedOutBy || '—'}</td>
                                    <td style={{ padding: '10px', textAlign: 'right', color: '#888' }}>
                                        {durationHrs ? `${durationHrs}h` : '—'}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
