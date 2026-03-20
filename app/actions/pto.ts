'use server'

import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'
import { revalidatePath } from 'next/cache'

export async function adjustPtoBalance(formData: FormData) {
    await requireAdmin()

    const userId = formData.get('userId') as string
    const amountStr = formData.get('amount') as string
    const reason = formData.get('reason') as string

    if (!userId || !amountStr) return { error: 'Missing required fields' }
    
    const amount = parseFloat(amountStr)
    if (isNaN(amount)) return { error: 'Invalid amount' }

    // Using transaction to ensure atomic increment/decrement
    try {
        await prisma.user.update({
            where: { id: userId },
            data: {
                ptoBalance: {
                    increment: amount
                }
            }
        })
        
        // Optionally, log the reason in a separate audit table, but for now we just adjust the balance
        console.log(`Adjusted PTO for user ${userId} by ${amount}. Reason: ${reason}`)

        revalidatePath(`/admin/employees/${userId}`)
        return { success: true }
    } catch (e) {
        console.error(e)
        return { error: 'Failed to update PTO balance' }
    }
}

export async function updatePtoRate(formData: FormData) {
    await requireAdmin()

    const userId = formData.get('userId') as string
    const rateStr = formData.get('rate') as string

    if (!userId || !rateStr) return { error: 'Missing required fields' }
    
    const rate = parseFloat(rateStr)
    if (isNaN(rate) || rate < 0) return { error: 'Invalid rate' }

    try {
        await prisma.user.update({
            where: { id: userId },
            data: { ptoRate: rate }
        })

        revalidatePath(`/admin/employees/${userId}`)
        return { success: true }
    } catch (e) {
        console.error(e)
        return { error: 'Failed to update PTO rate' }
    }
}
