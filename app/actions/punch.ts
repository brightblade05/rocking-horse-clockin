'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getTodaySchedule, getCurrentPunch } from '@/lib/data'

export async function clockIn(formData: FormData) {
    const userId = formData.get('userId') as string
    const roleId = formData.get('roleId') as string
    const note = formData.get('note') as string | null

    // Validation logic
    const schedule = await getTodaySchedule(userId)
    const now = new Date()

    if (schedule) {
        const startDiff = (now.getTime() - schedule.startTime.getTime()) / 60000 // minutes
        // If startDiff is positive: Late. Negative: Early.
        const isLate = startDiff > 5
        const isEarly = startDiff < -5

        if ((isLate || isEarly) && !note) {
            return {
                status: 'NOTE_REQUIRED',
                reason: isLate ? 'LATE_IN' : 'EARLY_IN',
                message: `You are ${Math.abs(Math.round(startDiff))} minutes ${isLate ? 'late' : 'early'}. Please provide a reason.`
            }
        }
    } else {
        // Unscheduled clock in?
        // Maybe require note too?
    }

    await prisma.punch.create({
        data: {
            userId,
            roleId: roleId || schedule?.roleId, // Use selected role or scheduled role
            type: 'IN',
            note,
            timestamp: now
        }
    })

    revalidatePath('/dashboard')
    return { status: 'SUCCESS' }
}

export async function clockOut(formData: FormData) {
    const userId = formData.get('userId') as string
    const note = formData.get('note') as string | null

    const schedule = await getTodaySchedule(userId)
    const now = new Date()

    if (schedule) {
        const endDiff = (now.getTime() - schedule.endTime.getTime()) / 60000
        // Positive: Late out (Overtime?). Negative: Early out.
        const isLateOut = endDiff > 5
        const isEarlyOut = endDiff < -5

        if ((isLateOut || isEarlyOut) && !note) {
            return {
                status: 'NOTE_REQUIRED',
                reason: isLateOut ? 'LATE_OUT' : 'EARLY_OUT',
                message: `You are clocking out ${Math.abs(Math.round(endDiff))} minutes ${isLateOut ? 'late' : 'early'}. Please provide a reason.`
            }
        }
    }

    await prisma.punch.create({
        data: {
            userId,
            type: 'OUT',
            note,
            timestamp: now
        }
    })

    revalidatePath('/dashboard')
    return { status: 'SUCCESS' }
}

export async function switchDuty(formData: FormData) {
    const userId = formData.get('userId') as string
    const newRoleId = formData.get('newRoleId') as string

    const now = new Date()

    const lastPunch = await getCurrentPunch(userId)

    // 1. Clock Out current duty
    if (lastPunch && lastPunch.type === 'IN') {
        await prisma.punch.create({
            data: {
                userId,
                type: 'OUT',
                note: 'Duty Switch',
                timestamp: now
            }
        })
    }

    // 2. Clock In new duty
    // Note: We might bypass schedule check for duty switch or enforce it? 
    // Duty switch usually intra-day, schedule might not define exact switch time.
    // We'll skip note requirement for switch for now unless user asks.

    await prisma.punch.create({
        data: {
            userId,
            roleId: newRoleId,
            type: 'IN',
            note: 'Duty Switch',
            timestamp: new Date(now.getTime() + 1000) // Ensure it's slightly after
        }
    })

    revalidatePath('/dashboard')
    return { status: 'SUCCESS' }
}
