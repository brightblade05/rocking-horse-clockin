'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/password'

/**
 * Staff kiosk login with PIN — scoped to an organization by slug.
 */
export async function loginWithPin(formData: FormData) {
    const pin = formData.get('pin') as string
    const orgSlug = formData.get('orgSlug') as string

    if (!pin) return { error: 'PIN is required' }
    if (!orgSlug) return { error: 'Organization not specified' }

    // Find the org
    const org = await prisma.organization.findUnique({ where: { slug: orgSlug } })
    if (!org || !org.isActive) return { error: 'Invalid organization' }

    // Find user with this PIN in this org
    const user = await prisma.user.findUnique({
        where: { organizationId_pin: { organizationId: org.id, pin } }
    })

    if (!user || !user.isActive) return { error: 'Invalid PIN' }

    const cookieStore = await cookies()
    cookieStore.set('rocking_horse_user', user.id, {
        httpOnly: true,
        path: '/',
        maxAge: 60 * 60 * 8,
        sameSite: 'lax',
    })
    cookieStore.set('rocking_horse_org', org.id, {
        httpOnly: true,
        path: '/',
        maxAge: 60 * 60 * 8,
        sameSite: 'lax',
    })

    redirect(`/kiosk/${orgSlug}/dashboard`)
}

/**
 * Org admin login — email + password with bcrypt verification.
 */
export async function loginAdmin(formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
        return { error: 'Email and password required' }
    }

    const user = await prisma.user.findUnique({
        where: { email },
        include: { organization: true }
    })

    if (!user || !user.isAdmin || !user.password) {
        return { error: 'Invalid admin credentials' }
    }

    const passwordValid = await verifyPassword(password, user.password)
    if (!passwordValid) {
        return { error: 'Invalid admin credentials' }
    }

    if (!user.organization.isActive) {
        return { error: 'Organization is inactive' }
    }

    const cookieStore = await cookies()
    cookieStore.set('rocking_horse_admin_session', user.id, {
        httpOnly: true,
        path: '/',
        maxAge: 60 * 60 * 8,
        sameSite: 'lax',
    })

    redirect('/admin')
}

/**
 * Master admin login — email + password.
 */
export async function loginMaster(formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
        return { error: 'Email and password required' }
    }

    const master = await prisma.masterAdmin.findUnique({
        where: { email }
    })

    if (!master) {
        return { error: 'Invalid credentials' }
    }

    const passwordValid = await verifyPassword(password, master.password)
    if (!passwordValid) {
        return { error: 'Invalid credentials' }
    }

    const cookieStore = await cookies()
    cookieStore.set('rocking_horse_master_session', master.id, {
        httpOnly: true,
        path: '/',
        maxAge: 60 * 60 * 12,
        sameSite: 'lax',
    })

    redirect('/master')
}

/**
 * Logout — clears all session cookies.
 */
export async function logout() {
    const cookieStore = await cookies()
    cookieStore.delete('rocking_horse_user')
    cookieStore.delete('rocking_horse_org')
    cookieStore.delete('rocking_horse_admin_session')
    cookieStore.delete('rocking_horse_master_session')
    redirect('/')
}
