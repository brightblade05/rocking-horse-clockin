import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import EmployeeListClient from './EmployeeListClient'

export default async function EmployeesPage() {
    const adminUser = await requireAdmin()

    const whereCondition: any = {
        organizationId: adminUser.organizationId,
    }
    if (adminUser.adminRole !== 'SUPERADMIN' && adminUser.locationId) {
        whereCondition.locationId = adminUser.locationId
    }

    const employees = await prisma.user.findMany({
        where: whereCondition,
        orderBy: { name: 'asc' },
        include: {
            location: true,
            _count: { select: { punches: true } }
        }
    })

    return (
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h1 style={{ color: 'var(--color-primary)', margin: 0 }}>Employees</h1>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <Link href="/admin/employees/new" className="btn btn-primary">+ Add Employee</Link>
                    <Link href="/admin" className="btn btn-secondary">← Dashboard</Link>
                </div>
            </header>

            <EmployeeListClient employees={employees.map(e => ({
                ...e,
                location: e.location?.name || null,
            })) as any} />
        </div>
    )
}
