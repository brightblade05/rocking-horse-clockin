import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import ArchiveButton from './ArchiveButton'

export default async function GuardianProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const currentUser = await requireAdmin()
    const { id } = await params

    const guardian = await prisma.guardian.findUnique({
        where: { id },
        include: {
            children: {
                orderBy: { firstName: 'asc' },
                include: { location: true }
            }
        }
    })

    if (!guardian || guardian.organizationId !== currentUser.organizationId) return notFound()

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
            <header style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <Link href="/admin/children" style={{ color: '#888', fontSize: '0.9rem' }}>← Guardians & Children</Link>
                    <h1 style={{ color: 'var(--color-secondary)', margin: '4px 0 0' }}>
                        {guardian.firstName} {guardian.lastName}
                        <span style={{ marginLeft: '10px', fontSize: '0.8rem', padding: '4px 12px', borderRadius: '6px', background: '#eef2ff', color: '#457B9D', fontFamily: 'monospace' }}>
                            PIN: {guardian.pin}
                        </span>
                        {!guardian.isActive && (
                            <span style={{ marginLeft: '10px', fontSize: '0.8rem', padding: '4px 12px', borderRadius: '6px', background: '#fff0f0', color: '#e63946', fontWeight: 'bold' }}>
                                ARCHIVED
                            </span>
                        )}
                    </h1>
                </div>
                
                {guardian.isActive && <ArchiveButton id={guardian.id} />}
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                {/* Guardian 1 Info */}
                <div className="card">
                    <h2 style={{ margin: '0 0 16px', fontSize: '1.1rem', color: '#457B9D' }}>Primary Guardian</h2>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                        <tbody>
                            {[
                                ['Name', `${guardian.firstName} ${guardian.lastName}`],
                                ['Relationship', guardian.relationshipToChild || '—'],
                                ['Primary Phone', guardian.phone || '—'],
                                ['Secondary Phone', guardian.secondaryPhone || '—'],
                                ['Email', guardian.email || '—'],
                                ['Address', [guardian.address, guardian.city, guardian.state, guardian.zip].filter(Boolean).join(', ') || '—'],
                                ['DL/ID #', guardian.driversLicenseId || '—'],
                            ].map(([label, value]) => (
                                <tr key={label as string} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                    <td style={{ padding: '10px 0', color: '#888', width: '40%' }}>{label}</td>
                                    <td style={{ padding: '10px 0', fontWeight: 500 }}>{value}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Guardian 2 Info */}
                <div className="card">
                    <h2 style={{ margin: '0 0 16px', fontSize: '1.1rem', color: '#457B9D' }}>Parent / Guardian 2</h2>
                    {guardian.guardian2FirstName ? (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                            <tbody>
                                {[
                                    ['Name', `${guardian.guardian2FirstName} ${guardian.guardian2LastName || ''}`],
                                    ['Relationship', guardian.guardian2Relationship || '—'],
                                    ['Primary Phone', guardian.guardian2Phone || '—'],
                                    ['Secondary Phone', guardian.guardian2SecondaryPhone || '—'],
                                    ['Email', guardian.guardian2Email || '—'],
                                    ['Address', [guardian.guardian2Address, guardian.guardian2City, guardian.guardian2State, guardian.guardian2Zip].filter(Boolean).join(', ') || '—'],
                                ].map(([label, value]) => (
                                    <tr key={label as string} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                        <td style={{ padding: '10px 0', color: '#888', width: '40%' }}>{label}</td>
                                        <td style={{ padding: '10px 0', fontWeight: 500 }}>{value}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div style={{ color: '#888', fontStyle: 'italic', padding: '20px 0' }}>No secondary guardian listed.</div>
                    )}
                </div>
            </div>

            {/* Linked Children */}
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Linked Children</h2>
                    <span style={{ background: '#e8f5e9', color: 'green', padding: '4px 12px', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                        {guardian.children.length} {guardian.children.length === 1 ? 'Child' : 'Children'}
                    </span>
                </div>
                
                {guardian.children.length === 0 ? (
                    <div style={{ padding: '30px', textAlign: 'center', color: '#888', background: '#f9f9f9', borderRadius: '8px' }}>
                        This guardian has no children linked to them.
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #eee', color: '#666', fontSize: '0.85rem' }}>
                                <th style={{ padding: '10px', textAlign: 'left' }}>Name</th>
                                <th style={{ padding: '10px', textAlign: 'left' }}>Location</th>
                                <th style={{ padding: '10px', textAlign: 'left' }}>Classroom</th>
                                <th style={{ padding: '10px', textAlign: 'left' }}>Enrolled</th>
                                <th style={{ padding: '10px', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {guardian.children.map(child => (
                                <tr key={child.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                                    <td style={{ padding: '12px', fontWeight: 'bold' }}>
                                        <Link href={`/admin/children/${child.id}`} style={{ color: 'var(--color-secondary)', textDecoration: 'underline' }}>
                                            {child.firstName} {child.lastName}
                                        </Link>
                                    </td>
                                    <td style={{ padding: '12px', color: '#555' }}>{child.location?.name || '—'}</td>
                                    <td style={{ padding: '12px', color: '#555' }}>{child.classroom || '—'}</td>
                                    <td style={{ padding: '12px', color: '#888' }}>{new Date(child.enrollDate).toLocaleDateString()}</td>
                                    <td style={{ padding: '12px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                        <Link href={`/admin/children/${child.id}`} className="btn" style={{ fontSize: '0.8rem', padding: '6px 10px', background: '#eef2ff', color: '#457B9D' }}>Profile</Link>
                                        <Link href={`/admin/children/${child.id}/edit`} className="btn" style={{ fontSize: '0.8rem', padding: '6px 10px', background: '#f8f9fa', color: '#333' }}>Edit</Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}
