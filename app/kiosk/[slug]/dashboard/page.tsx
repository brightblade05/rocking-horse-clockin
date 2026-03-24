import { requireUser, getCurrentPunch, getOrgRoles } from '@/lib/data'
import EmployeeDashboardClient from './EmployeeDashboardClient'

export default async function DashboardPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const user = await requireUser()
    const currentPunch = await getCurrentPunch(user.id)
    const roles = await getOrgRoles(user.organizationId)

    const todayString = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

    return (
        <EmployeeDashboardClient
            user={user}
            currentPunch={currentPunch}
            roles={roles}
            todayString={todayString}
            orgSlug={slug}
        />
    )
}
