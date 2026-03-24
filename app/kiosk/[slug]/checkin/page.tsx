import GuardianCheckinClient from './GuardianCheckinClient'

export default async function KioskCheckinPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    return <GuardianCheckinClient orgSlug={slug} />
}
