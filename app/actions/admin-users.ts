'use server'

import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'
import { hashPassword } from '@/lib/password'
import { revalidatePath } from 'next/cache'

export async function createEmployee(formData: FormData) {
    const currentUser = await requireAdmin()
    const organizationId = currentUser.organizationId

    const name = formData.get('name') as string
    const pin = formData.get('pin') as string
    const payType = formData.get('payType') as string || 'HOURLY'
    const baseRate = parseFloat(formData.get('baseRate') as string) || 15
    const yearlySalary = parseFloat(formData.get('yearlySalary') as string) || null
    const adminRole = formData.get('adminRole') as string || 'NONE'
    const locationId = (formData.get('locationId') as string) || null
    const isAdmin = adminRole !== 'NONE' || formData.get('isAdmin') === 'on'
    const email = (formData.get('email') as string) || null
    const passwordRaw = formData.get('password') as string

    if (!name || !pin) {
        return { error: 'Missing required fields' }
    }

    // Check unique PIN within org
    const existing = await prisma.user.findUnique({
        where: { organizationId_pin: { organizationId, pin } }
    })
    if (existing) {
        return { error: 'PIN already exists in this organization' }
    }

    // Check email uniqueness globally
    if (email) {
        const existingEmail = await prisma.user.findUnique({ where: { email } })
        if (existingEmail) return { error: 'Email already in use' }
    }

    const hashedPassword = isAdmin && passwordRaw ? await hashPassword(passwordRaw) : null

    await prisma.user.create({
        data: {
            organizationId,
            name,
            pin,
            email,
            baseRate,
            payType,
            yearlySalary,
            isAdmin,
            adminRole,
            locationId,
            password: hashedPassword,
        }
    })

    revalidatePath('/admin/employees')
    return { success: true }
}

export async function updateEmployee(formData: FormData) {
    const currentUser = await requireAdmin()

    const id = formData.get('id') as string
    const name = formData.get('name') as string
    const pin = formData.get('pin') as string
    const payType = formData.get('payType') as string || 'HOURLY'
    const baseRate = parseFloat(formData.get('baseRate') as string) || 15
    const yearlySalary = parseFloat(formData.get('yearlySalary') as string) || null
    const phone = (formData.get('phone') as string) || null
    const address = (formData.get('address') as string) || null
    const emergencyContact = (formData.get('emergencyContact') as string) || null
    const notes = (formData.get('notes') as string) || null
    const hireDateStr = formData.get('hireDate') as string
    const adminRole = (formData.get('adminRole') as string) || 'NONE'
    const locationId = (formData.get('locationId') as string) || null
    const isAdmin = adminRole !== 'NONE'

    // Verify employee belongs to same org
    const employee = await prisma.user.findUnique({ where: { id } })
    if (!employee || employee.organizationId !== currentUser.organizationId) {
        return { error: 'Employee not found' }
    }

    const data: Record<string, any> = {
        name, pin, baseRate, payType, yearlySalary,
        phone, address, emergencyContact, notes,
        adminRole, locationId, isAdmin
    }
    if (hireDateStr) data.hireDate = new Date(hireDateStr)

    await prisma.user.update({ where: { id }, data })
    revalidatePath(`/admin/employees/${id}`)
    revalidatePath('/admin/employees')
}

export async function toggleEmployeeStatus(id: string, isActive: boolean) {
    const currentUser = await requireAdmin()
    const employee = await prisma.user.findUnique({ where: { id } })
    if (!employee || employee.organizationId !== currentUser.organizationId) {
        return { error: 'Not authorized' }
    }
    await prisma.user.update({ where: { id }, data: { isActive } })
    revalidatePath('/admin/employees')
    return { success: true }
}

export async function assignRoleRate(formData: FormData) {
    await requireAdmin()

    const userId = formData.get('userId') as string
    const roleId = formData.get('roleId') as string
    const rateString = formData.get('rate') as string

    let rate = parseFloat(rateString)
    if (!userId || !roleId) return { error: 'Invalid data' }

    if (isNaN(rate)) {
        const role = await prisma.role.findUnique({ where: { id: roleId } })
        if (role && role.defaultRate) rate = role.defaultRate
        else return { error: 'Rate is required' }
    }

    await prisma.userRole.upsert({
        where: { userId_roleId: { userId, roleId } },
        create: { userId, roleId, rate },
        update: { rate }
    })

    revalidatePath(`/admin/employees/${userId}`)
    return { success: true }
}

export async function exportEmployeesCsv() {
    const currentUser = await requireAdmin()
    const employees = await prisma.user.findMany({
        where: { isActive: true, organizationId: currentUser.organizationId },
        orderBy: { name: 'asc' },
        include: { location: true }
    })

    const headers = ['name', 'pin', 'email', 'phone', 'address', 'emergencyContact', 'baseRate', 'employmentType', 'hireDate', 'notes', 'location']
    const rows = employees.map(e => headers.map(h => {
        let val: any
        if (h === 'location') val = e.location?.name
        else val = (e as any)[h]
        if (!val && val !== 0) return ''
        if (val instanceof Date) return val.toISOString().split('T')[0]
        return `"${String(val).replace(/"/g, '""')}"`
    }).join(','))

    return [headers.join(','), ...rows].join('\n')
}

export async function importEmployeesCsv(csvText: string) {
    const currentUser = await requireAdmin()
    const organizationId = currentUser.organizationId

    const lines = csvText.trim().split('\n')
    const headers = lines[0].split(',').map(h => h.trim())
    let created = 0; let errors = 0

    for (let i = 1; i < lines.length; i++) {
        try {
            const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, '').replace(/""/g, '"'))
            const row: Record<string, string> = {}
            headers.forEach((h, idx) => { row[h] = values[idx] || '' })

            if (!row.name || !row.pin) { errors++; continue }

            const existing = await prisma.user.findUnique({
                where: { organizationId_pin: { organizationId, pin: row.pin } }
            })
            if (existing) { errors++; continue }

            await prisma.user.create({
                data: {
                    organizationId,
                    name: row.name,
                    pin: row.pin,
                    email: row.email || null,
                    phone: row.phone || null,
                    address: row.address || null,
                    emergencyContact: row.emergencyContact || null,
                    baseRate: parseFloat(row.baseRate) || 15,
                    employmentType: row.employmentType || 'FULL_TIME',
                    notes: row.notes || null,
                    hireDate: row.hireDate ? new Date(row.hireDate) : null,
                }
            })
            created++
        } catch { errors++ }
    }

    revalidatePath('/admin/employees')
    return { created, errors }
}
