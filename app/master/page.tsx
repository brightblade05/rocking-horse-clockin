import { requireMasterAdmin } from '@/lib/admin-auth'
import { getOrganizations } from '@/app/actions/master'
import MasterDashboardClient from './MasterDashboardClient'

export default async function MasterDashboardPage() {
    await requireMasterAdmin()
    const organizations = await getOrganizations()

    return <MasterDashboardClient organizations={organizations} />
}
