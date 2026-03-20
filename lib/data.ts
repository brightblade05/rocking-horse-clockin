import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

export async function getCurrentUser() {
    const cookieStore = await cookies()
    const userId = cookieStore.get('rocking_horse_user')?.value

    if (!userId) return null

    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            organization: true,
            location: true,
            userRoles: {
                include: { role: true }
            }
        }
    })

    return user
}

export async function requireUser() {
    const user = await getCurrentUser()
    if (!user) redirect('/')
    return user
}

export async function getCurrentPunch(userId: string) {
    const lastPunch = await prisma.punch.findFirst({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        include: { role: true }
    })

    if (!lastPunch) return null
    if (lastPunch.type === 'OUT') return null

    return lastPunch
}

export async function getTodaySchedule(userId: string) {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)

    return await prisma.schedule.findFirst({
        where: {
            userId,
            date: {
                gte: startOfDay,
                lte: endOfDay
            }
        },
        include: { role: true }
    })
}

export async function getTodayPunches(userId: string) {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    return await prisma.punch.findMany({
        where: {
            userId,
            timestamp: {
                gte: startOfDay
            }
        },
        orderBy: { timestamp: 'desc' },
        include: { role: true }
    })
}

export async function getAllRoles() {
    return await prisma.role.findMany()
}

export async function getOrgRoles(organizationId: string) {
    return await prisma.role.findMany({
        where: { organizationId },
        orderBy: { name: 'asc' }
    })
}

export async function getOrgLocations(organizationId: string) {
    return await prisma.location.findMany({
        where: { organizationId, isActive: true },
        orderBy: { name: 'asc' }
    })
}
