'use server'

import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

export type PayrollEntry = {
    userId: string
    name: string
    regularHours: number
    overtimeHours: number
    totalHours: number
    grossPay: number
    accruedPto: number
    details: {
        roleName: string
        hours: number
        rate: number
        pay: number
    }[]
}

export async function getPayrollReport(startDate: Date, endDate: Date) {
    const adminUser = await requireAdmin()

    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)

    const whereCondition: any = {
        isActive: true,
        organizationId: adminUser.organizationId,
    }
    // If not SUPERADMIN, scope to their location
    if (adminUser.adminRole !== 'SUPERADMIN' && adminUser.locationId) {
        whereCondition.locationId = adminUser.locationId
    }

    const users = await prisma.user.findMany({
        where: whereCondition,
        include: {
            punches: {
                where: {
                    timestamp: { gte: start, lte: end }
                },
                orderBy: { timestamp: 'asc' },
                include: { role: true }
            },
            userRoles: {
                include: { role: true }
            }
        }
    })

    const report: PayrollEntry[] = []

    for (const user of users) {
        let totalMs = 0
        const roleMs: Record<string, number> = {}
        const roleData: Record<string, { name: string, rate: number }> = {}

        let currentIn: Date | null = null
        let currentRole: any = null

        for (const punch of user.punches) {
            if (punch.type === 'IN') {
                currentIn = punch.timestamp
                currentRole = punch.role
            } else if (punch.type === 'OUT' && currentIn) {
                const ms = punch.timestamp.getTime() - currentIn.getTime()
                totalMs += ms

                const rId = currentRole?.id || 'default'
                if (!roleMs[rId]) roleMs[rId] = 0
                roleMs[rId] += ms

                if (!roleData[rId]) {
                    let rate = user.baseRate
                    if (rId !== 'default') {
                        const ur = user.userRoles.find(ur => ur.roleId === rId)
                        if (ur) rate = ur.rate
                        else rate = currentRole?.defaultRate || user.baseRate
                    }
                    roleData[rId] = { name: currentRole?.name || 'General', rate }
                }

                currentIn = null
                currentRole = null
            }
        }

        const totalHours = totalMs / (1000 * 60 * 60)

        let grossPay = 0
        const details = []

        if (user.payType === 'SALARY' && user.yearlySalary) {
            const msInDay = 1000 * 60 * 60 * 24
            const daysInPeriod = Math.round((end.getTime() - start.getTime()) / msInDay)
            grossPay = (user.yearlySalary / 365) * daysInPeriod
            details.push({
                roleName: 'Salary (Prorated for Period)',
                hours: totalHours,
                rate: 0,
                pay: grossPay
            })
        } else {
            for (const [rId, ms] of Object.entries(roleMs)) {
                const h = ms / (1000 * 60 * 60)
                const rate = roleData[rId].rate
                const pay = h * rate
                grossPay += pay
                details.push({ roleName: roleData[rId].name, hours: h, rate, pay })
            }
        }

        if (totalHours > 0) {
            const accruedPto = totalHours * user.ptoRate
            report.push({
                userId: user.id,
                name: user.name,
                regularHours: totalHours,
                overtimeHours: 0,
                totalHours,
                grossPay,
                accruedPto,
                details
            })
        }
    }

    return report
}
