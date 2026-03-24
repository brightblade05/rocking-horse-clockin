import { requireAdmin } from '@/lib/admin-auth'
import ReportsClient from './ReportsClient'

export default async function ReportsPage() {
    await requireAdmin()
    return <ReportsClient />
}
