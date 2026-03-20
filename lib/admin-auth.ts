import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'

/**
 * Require a logged-in org admin. Returns the user with organizationId.
 */
export async function requireAdmin() {
    const cookieStore = await cookies()
    const adminId = cookieStore.get('rocking_horse_admin_session')?.value

    if (!adminId) {
        redirect('/admin/login')
    }

    const user = await prisma.user.findUnique({
        where: { id: adminId },
        include: { organization: true, location: true }
    })

    if (!user || (!user.isAdmin && user.adminRole === 'NONE')) {
        redirect('/admin/login')
    }

    return user
}

/**
 * Require org admin and verify they belong to the given org.
 */
export async function requireOrgAdmin(orgId: string) {
    const user = await requireAdmin()
    if (user.organizationId !== orgId) {
        redirect('/admin/login')
    }
    return user
}

/**
 * Require master admin login.
 */
export async function requireMasterAdmin() {
    const cookieStore = await cookies()
    const masterId = cookieStore.get('rocking_horse_master_session')?.value

    if (!masterId) {
        redirect('/master/login')
    }

    const master = await prisma.masterAdmin.findUnique({
        where: { id: masterId }
    })

    if (!master) {
        redirect('/master/login')
    }

    return master
}
