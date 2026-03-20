'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin-auth"

export async function getRoles() {
    const currentUser = await requireAdmin()
    return await prisma.role.findMany({
        where: { organizationId: currentUser.organizationId },
        orderBy: { name: 'asc' }
    })
}

export async function createRole(formData: FormData) {
    const currentUser = await requireAdmin()
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const defaultRateStr = formData.get('defaultRate') as string

    if (!name) {
        throw new Error('Role name is required')
    }

    const defaultRate = defaultRateStr ? parseFloat(defaultRateStr) : null

    try {
        await prisma.role.create({
            data: {
                organizationId: currentUser.organizationId,
                name,
                description,
                defaultRate
            }
        })
        revalidatePath('/admin/roles')
        return { success: true }
    } catch (error) {
        console.error('Failed to create role:', error)
        return { success: false, error: 'Failed to create role (name may already exist)' }
    }
}

export async function updateRole(id: string, formData: FormData) {
    const currentUser = await requireAdmin()
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const defaultRateStr = formData.get('defaultRate') as string

    const defaultRate = defaultRateStr ? parseFloat(defaultRateStr) : null

    const role = await prisma.role.findUnique({ where: { id } })
    if (!role || role.organizationId !== currentUser.organizationId) {
        return { success: false, error: 'Role not found' }
    }

    try {
        await prisma.role.update({
            where: { id },
            data: { name, description, defaultRate }
        })
        revalidatePath('/admin/roles')
        return { success: true }
    } catch (error) {
        console.error('Failed to update role:', error)
        return { success: false, error: 'Failed to update role' }
    }
}

export async function deleteRole(id: string) {
    const currentUser = await requireAdmin()
    const role = await prisma.role.findUnique({ where: { id } })
    if (!role || role.organizationId !== currentUser.organizationId) {
        return { success: false, error: 'Role not found' }
    }

    try {
        await prisma.role.delete({ where: { id } })
        revalidatePath('/admin/roles')
        return { success: true }
    } catch (error) {
        console.error('Failed to delete role:', error)
        return { success: false, error: 'Failed to delete role' }
    }
}
