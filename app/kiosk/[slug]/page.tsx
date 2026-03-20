import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import KioskClient from './KioskClient'

export default async function KioskPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params

    const org = await prisma.organization.findUnique({
        where: { slug },
        include: {
            locations: { where: { isActive: true }, orderBy: { name: 'asc' } }
        }
    })

    if (!org || !org.isActive) redirect('/')

    return <KioskClient org={{ id: org.id, name: org.name, slug: org.slug }} />
}
