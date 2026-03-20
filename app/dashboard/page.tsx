import { requireUser, getCurrentPunch, getAllRoles, getTodaySchedule } from '@/lib/data'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
    const user = await requireUser()
    const currentPunch = await getCurrentPunch(user.id)
    // const schedule = await getTodaySchedule(user.id)
    const roles = await getAllRoles()

    const todayString = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

    return (
        <DashboardClient
            user={user}
            currentPunch={currentPunch}
            roles={roles}
            todayString={todayString}
        />
    )
}
