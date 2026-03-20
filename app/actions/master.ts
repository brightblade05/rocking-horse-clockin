'use server'

import { prisma } from '@/lib/prisma'
import { requireMasterAdmin } from '@/lib/admin-auth'
import { hashPassword } from '@/lib/password'
import { revalidatePath } from 'next/cache'

// ── Organization CRUD ────────────────────────────────────

export async function getOrganizations() {
    await requireMasterAdmin()
    return prisma.organization.findMany({
        orderBy: { name: 'asc' },
        include: {
            locations: { where: { isActive: true }, orderBy: { name: 'asc' } },
            _count: { select: { users: true, children: true } }
        }
    })
}

export async function getOrganization(id: string) {
    await requireMasterAdmin()
    return prisma.organization.findUnique({
        where: { id },
        include: {
            locations: { orderBy: { name: 'asc' } },
            users: {
                where: { isAdmin: true },
                orderBy: { name: 'asc' },
                select: { id: true, name: true, email: true, adminRole: true, isActive: true, locationId: true }
            },
            _count: { select: { users: true, children: true, guardians: true } }
        }
    })
}

function slugify(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export async function createOrganization(formData: FormData) {
    await requireMasterAdmin()

    const name = (formData.get('name') as string)?.trim()
    if (!name) return { error: 'Organization name is required' }

    const slug = slugify(name)

    // Check unique
    const existing = await prisma.organization.findFirst({
        where: { OR: [{ name }, { slug }] }
    })
    if (existing) return { error: 'An organization with this name already exists' }

    await prisma.organization.create({ data: { name, slug } })
    revalidatePath('/master')
    return { success: true }
}

export async function updateOrganization(formData: FormData) {
    await requireMasterAdmin()

    const id = formData.get('id') as string
    const name = (formData.get('name') as string)?.trim()
    const isActive = formData.get('isActive') === 'true'

    if (!id || !name) return { error: 'Missing required fields' }

    const slug = slugify(name)
    await prisma.organization.update({ where: { id }, data: { name, slug, isActive } })
    revalidatePath('/master')
    revalidatePath(`/master/orgs/${id}`)
    return { success: true }
}

// ── Location CRUD ───────────────────────────────────────

export async function createLocation(formData: FormData) {
    await requireMasterAdmin()

    const organizationId = formData.get('organizationId') as string
    const name = (formData.get('name') as string)?.trim()
    const address = (formData.get('address') as string) || null
    const phone = (formData.get('phone') as string) || null

    if (!organizationId || !name) return { error: 'Organization and name required' }

    const existing = await prisma.location.findUnique({
        where: { organizationId_name: { organizationId, name } }
    })
    if (existing) return { error: 'Location already exists in this organization' }

    await prisma.location.create({ data: { organizationId, name, address, phone } })
    revalidatePath(`/master/orgs/${organizationId}`)
    return { success: true }
}

export async function updateLocation(formData: FormData) {
    await requireMasterAdmin()

    const id = formData.get('id') as string
    const name = (formData.get('name') as string)?.trim()
    const address = (formData.get('address') as string) || null
    const phone = (formData.get('phone') as string) || null
    const isActive = formData.get('isActive') === 'true'

    if (!id || !name) return { error: 'Missing required fields' }

    const location = await prisma.location.findUnique({ where: { id } })
    if (!location) return { error: 'Location not found' }

    await prisma.location.update({ where: { id }, data: { name, address, phone, isActive } })
    revalidatePath(`/master/orgs/${location.organizationId}`)
    return { success: true }
}

// ── Org Admin Management ────────────────────────────────

export async function createOrgAdmin(formData: FormData) {
    await requireMasterAdmin()

    const organizationId = formData.get('organizationId') as string
    const name = (formData.get('name') as string)?.trim()
    const email = (formData.get('email') as string)?.trim()
    const password = formData.get('password') as string
    const adminRole = (formData.get('adminRole') as string) || 'SUPERADMIN'
    const pin = formData.get('pin') as string

    if (!organizationId || !name || !email || !password || !pin) {
        return { error: 'All fields are required' }
    }

    // Check email uniqueness
    const existingEmail = await prisma.user.findUnique({ where: { email } })
    if (existingEmail) return { error: 'Email already in use' }

    // Check PIN uniqueness within org
    const existingPin = await prisma.user.findUnique({
        where: { organizationId_pin: { organizationId, pin } }
    })
    if (existingPin) return { error: 'PIN already in use in this organization' }

    const hashedPassword = await hashPassword(password)

    await prisma.user.create({
        data: {
            organizationId,
            name,
            email,
            password: hashedPassword,
            pin,
            isAdmin: true,
            adminRole,
        }
    })

    revalidatePath(`/master/orgs/${organizationId}`)
    return { success: true }
}
