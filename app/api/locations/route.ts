import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const currentUser = await requireAdmin()
        const locations = await prisma.location.findMany({
            where: { organizationId: currentUser.organizationId, isActive: true },
            select: { id: true, name: true },
            orderBy: { name: 'asc' }
        })
        return NextResponse.json(locations)
    } catch {
        return NextResponse.json([])
    }
}
