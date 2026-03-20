import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { getOrgLocations } from '@/lib/data'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { updateChild } from '@/app/actions/children'

export default async function EditChildPage({ params }: { params: Promise<{ id: string }> }) {
    const currentUser = await requireAdmin()
    const { id } = await params

    const child = await prisma.child.findUnique({
        where: { id },
        include: { guardian: true, location: true }
    })
    if (!child || child.organizationId !== currentUser.organizationId) return notFound()

    const locations = await getOrgLocations(currentUser.organizationId)
    const guardians = await prisma.guardian.findMany({
        where: { organizationId: currentUser.organizationId, isActive: true },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
    })

    return (
        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '20px' }}>
            <header style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <Link href={`/admin/children/${id}`} style={{ color: '#888', fontSize: '0.9rem' }}>← Back to Profile</Link>
                    <h1 style={{ margin: '4px 0 0', color: 'var(--color-secondary)' }}>Edit: {child.firstName} {child.lastName}</h1>
                </div>
            </header>

            <div className="card">
                <form action={async (fd: FormData) => {
                    'use server'
                    fd.append('id', id)
                    await updateChild(fd)
                    redirect(`/admin/children/${id}`)
                }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px', fontSize: '0.9rem' }}>First Name *</label>
                            <input name="firstName" defaultValue={child.firstName} className="input" required />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px', fontSize: '0.9rem' }}>Last Name *</label>
                            <input name="lastName" defaultValue={child.lastName} className="input" required />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px', fontSize: '0.9rem' }}>Date of Birth</label>
                            <input name="dateOfBirth" type="date" defaultValue={child.dateOfBirth ? new Date(child.dateOfBirth).toISOString().split('T')[0] : ''} className="input" />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px', fontSize: '0.9rem' }}>Classroom / Group</label>
                            <input name="classroom" defaultValue={child.classroom || ''} className="input" placeholder="e.g. Toddlers, Pre-K" />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px', fontSize: '0.9rem' }}>Location</label>
                            <select name="locationId" defaultValue={child.locationId || ''} className="input">
                                <option value="">No Location</option>
                                {locations.map(loc => (
                                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px', fontSize: '0.9rem' }}>Guardian</label>
                            <select name="guardianId" defaultValue={child.guardianId || ''} className="input">
                                <option value="">No Guardian Linked</option>
                                {guardians.map(g => (
                                    <option key={g.id} value={g.id}>{g.firstName} {g.lastName}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px', fontSize: '0.9rem' }}>Emergency Contact (Name & Phone)</label>
                        <input name="emergencyContact" defaultValue={child.emergencyContact || ''} className="input" placeholder="Jane Smith - (555) 123-4567" />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px', fontSize: '0.9rem' }}>Allergies / Medical Notes</label>
                        <textarea name="allergies" defaultValue={child.allergies || ''} className="input" rows={2} placeholder="Peanuts, latex allergy, EpiPen in bag…" style={{ resize: 'vertical' }} />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px', fontSize: '0.9rem' }}>Admin Notes</label>
                        <textarea name="notes" defaultValue={child.notes || ''} className="input" rows={2} style={{ resize: 'vertical' }} />
                    </div>

                    <div style={{ display: 'flex', gap: '12px', paddingTop: '8px' }}>
                        <Link href={`/admin/children/${id}`} className="btn" style={{ background: '#eee', color: '#333' }}>Cancel</Link>
                        <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    )
}
