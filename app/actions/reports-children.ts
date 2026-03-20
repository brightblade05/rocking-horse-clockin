'use server'

import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

export type ChildAttendanceReport = {
    totalChildren: number
    totalAttendances: number
    childrenByLocation: Record<string, number>
    averageTimeSpentMs: number
    attendanceByDay: { date: string, count: number }[]
    childrenList: {
        id: string
        name: string
        location: string
        classroom: string
        totalDays: number
        totalHours: number
    }[]
}

export async function getChildAttendanceReport(startDate: Date, endDate: Date): Promise<ChildAttendanceReport> {
    const adminUser = await requireAdmin()

    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)

    const whereCondition: any = {
        isActive: true,
        organizationId: adminUser.organizationId,
    }
    if (adminUser.adminRole !== 'SUPERADMIN' && adminUser.locationId) {
        whereCondition.locationId = adminUser.locationId
    }

    const children = await prisma.child.findMany({
        where: whereCondition,
        include: {
            location: true,
            attendance: {
                where: { checkIn: { gte: start, lte: end } }
            }
        }
    })

    let totalAttendances = 0
    let totalCompletedDurationMs = 0
    let completedAttendances = 0

    const childrenByLocation: Record<string, number> = {}
    const attendanceByDayRecord: Record<string, Set<string>> = {}

    const childrenList = children.map((child: any) => {
        let childDays = 0
        let childDurationMs = 0

        const loc = child.location?.name || 'Unassigned'
        childrenByLocation[loc] = (childrenByLocation[loc] || 0) + 1

        child.attendance.forEach((att: any) => {
            childDays++
            totalAttendances++

            const dateStr = att.checkIn.toISOString().split('T')[0]
            if (!attendanceByDayRecord[dateStr]) attendanceByDayRecord[dateStr] = new Set()
            attendanceByDayRecord[dateStr].add(child.id)

            if (att.checkOut) {
                const duration = att.checkOut.getTime() - att.checkIn.getTime()
                childDurationMs += duration
                totalCompletedDurationMs += duration
                completedAttendances++
            }
        })

        return {
            id: child.id,
            name: `${child.firstName} ${child.lastName}`,
            location: loc,
            classroom: child.classroom || 'Unassigned',
            totalDays: childDays,
            totalHours: childDurationMs / (1000 * 60 * 60)
        }
    })

    childrenList.sort((a: any, b: any) => a.name.localeCompare(b.name))

    const averageTimeSpentMs = completedAttendances > 0 ? totalCompletedDurationMs / completedAttendances : 0

    const attendanceByDay = Object.entries(attendanceByDayRecord)
        .map(([date, set]) => ({ date, count: set.size }))
        .sort((a: any, b: any) => a.date.localeCompare(b.date))

    return {
        totalChildren: children.length,
        totalAttendances,
        childrenByLocation,
        averageTimeSpentMs,
        attendanceByDay,
        childrenList
    }
}
