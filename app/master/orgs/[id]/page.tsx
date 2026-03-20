import { requireMasterAdmin } from '@/lib/admin-auth'
import { getOrganization } from '@/app/actions/master'
import { redirect } from 'next/navigation'
import OrgDetailClient from './OrgDetailClient'

export default async function OrgDetailPage({ params }: { params: Promise<{ id: string }> }) {
    await requireMasterAdmin()
    const { id } = await params
    const org = await getOrganization(id)

    if (!org) redirect('/master')

    return <OrgDetailClient org={org} />
}
