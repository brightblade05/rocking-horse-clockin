import { requireAdmin } from '@/lib/admin-auth'
import ChildReportClient from './ChildReportClient'

export default async function ChildReportsPage() {
    await requireAdmin()

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <ChildReportClient />
        </div>
    )
}
