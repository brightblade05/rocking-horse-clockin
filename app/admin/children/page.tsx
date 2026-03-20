import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { getTodayAttendance } from '@/app/actions/children'
import Link from 'next/link'
import ChildrenAdminClient from './ChildrenAdminClient'

export default async function ChildrenAdminPage({ searchParams }: { searchParams: Promise<{ archived?: string }> }) {
    const adminUser = await requireAdmin()
    
    const params = await searchParams
    const showArchived = params.archived === 'true'

    const childWhereCondition: any = {
        isActive: !showArchived,
        organizationId: adminUser.organizationId,
    }
    if (adminUser.adminRole !== 'SUPERADMIN' && adminUser.locationId) {
        childWhereCondition.locationId = adminUser.locationId
    }

    const children = await prisma.child.findMany({
        where: childWhereCondition,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        include: { guardian: true, location: true }
    })

    const guardianWhereCondition: any = {
        isActive: !showArchived,
        organizationId: adminUser.organizationId,
    }

    const guardians = await prisma.guardian.findMany({
        where: guardianWhereCondition,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        include: { _count: { select: { children: true } } }
    })

    const todayAttendance = await getTodayAttendance()

    // Map location relation to string for client component
    const mappedChildren = children.map(c => ({
        ...c,
        location: c.location?.name || null,
    }))

    return (
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px' }}>
            <header style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ color: 'var(--color-primary)', margin: 0 }}>👶 Children</h1>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <Link href="/admin" className="btn">← Dashboard</Link>
                </div>
            </header>

            <ChildrenAdminClient children={mappedChildren as any} guardians={guardians as any} todayAttendance={todayAttendance as any} showArchived={showArchived} />
        </div>
    )
}
