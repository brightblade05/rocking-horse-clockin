import { requireAdmin } from '@/lib/admin-auth'
import RolesClient from './RolesClient'

export default async function RolesPage() {
    await requireAdmin()
    return <RolesClient />
}
