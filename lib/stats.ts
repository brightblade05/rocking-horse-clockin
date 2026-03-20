import { prisma } from '@/lib/prisma'

export async function getEmployeeStats(userId: string) {
    const now = new Date()

    // Timestamps for different windows
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    const startOf30Days = new Date(now)
    startOf30Days.setDate(now.getDate() - 30)

    // Get employee with roles for rate lookups
    const employee = await prisma.user.findUnique({
        where: { id: userId },
        include: { userRoles: true }
    })
    if (!employee) throw new Error('Employee not found')

    // Helper to find rate for a role
    const getRate = (roleId: string | null) => {
        if (!roleId) return employee.baseRate
        const specific = employee.userRoles.find(ur => ur.roleId === roleId)
        return specific ? specific.rate : employee.baseRate
    }

    // Fetch week's punches for Cost/Hours
    const weekPunches = await prisma.punch.findMany({
        where: {
            userId,
            timestamp: { gte: startOfWeek }
        },
        orderBy: { timestamp: 'asc' },
        include: { role: true } // to get role names if needed
    })

    // Fetch 30 days punches for Reliability
    const monthPunches = await prisma.punch.findMany({
        where: {
            userId,
            timestamp: { gte: startOf30Days }
        },
        orderBy: { timestamp: 'asc' }
    })

    // --- CALC 1: COST & HOURS & ROLES ---
    let totalMilliseconds = 0
    let estimatedCost = 0
    let activePunchStart: Date | null = null
    let activePunchRole: string | null = null

    for (const punch of weekPunches) {
        if (punch.type === 'IN' || punch.type === 'TRANSFER_START') {
            // If already active (TRANSFER), close previous segment first
            if (activePunchStart) {
                const duration = punch.timestamp.getTime() - activePunchStart.getTime()
                const hours = duration / (1000 * 60 * 60)
                const rate = getRate(activePunchRole)

                totalMilliseconds += duration
                estimatedCost += hours * rate
            }

            activePunchStart = punch.timestamp
            activePunchRole = punch.roleId
        } else if (punch.type === 'OUT' && activePunchStart) {
            const duration = punch.timestamp.getTime() - activePunchStart.getTime()
            const hours = duration / (1000 * 60 * 60)
            const rate = getRate(activePunchRole)

            totalMilliseconds += duration
            estimatedCost += hours * rate

            activePunchStart = null
            activePunchRole = null
        }
    }

    const weeklyHours = totalMilliseconds / (1000 * 60 * 60)

    // --- CALC 2: RELIABILITY (Exceptions) ---
    // Count shifts (INs) and count Note exceptions.
    let shiftCount = 0
    let exceptionCount = 0
    let weekExceptions = 0

    for (const punch of monthPunches) {
        if (punch.type === 'IN') shiftCount++
        if (punch.note) exceptionCount++
    }

    // Count exceptions just for this week for the separate card
    for (const punch of weekPunches) {
        if (punch.note) weekExceptions++
    }

    const reliabilityScore = shiftCount === 0 ? 100 : Math.max(0, 100 - Math.round((exceptionCount / shiftCount) * 100))

    return {
        weeklyHours: parseFloat(weeklyHours.toFixed(2)),
        estimatedCost: parseFloat(estimatedCost.toFixed(2)),
        exceptionsCount: weekExceptions,
        reliabilityScore,
        lastActive: activePunchStart ? 'Active Now' : 'Offline'
    }
}
