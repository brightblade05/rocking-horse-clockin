'use server'

import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'
import { revalidatePath } from 'next/cache'

// ─────────────────────────────────────────────────────────
// Kiosk: Guardian PIN lookup (org-scoped)
// ─────────────────────────────────────────────────────────

export async function getChildrenByGuardianPin(pin: string, orgSlug: string) {
    if (!pin) return { error: 'PIN required' }
    if (!orgSlug) return { error: 'Organization required' }

    const org = await prisma.organization.findUnique({ where: { slug: orgSlug } })
    if (!org || !org.isActive) return { error: 'Invalid organization' }

    const guardian = await prisma.guardian.findUnique({
        where: { organizationId_pin: { organizationId: org.id, pin } },
        include: {
            children: {
                where: { isActive: true },
                orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
                include: {
                    attendance: {
                        where: { checkIn: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
                        orderBy: { checkIn: 'desc' },
                        take: 1
                    }
                }
            }
        }
    })

    if (!guardian || !guardian.isActive) return { error: 'PIN not found' }
    return { guardian, children: guardian.children }
}

// ─────────────────────────────────────────────────────────
// Kiosk: Check In / Out
// ─────────────────────────────────────────────────────────

export async function checkInChild(formData: FormData) {
    const childId = formData.get('childId') as string
    const checkedInBy = formData.get('checkedInBy') as string
    if (!childId) return { error: 'Missing child ID' }

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const existing = await prisma.childAttendance.findFirst({
        where: { childId, checkIn: { gte: todayStart }, checkOut: null }
    })
    if (existing) return { error: 'Already checked in.' }

    await prisma.childAttendance.create({ data: { childId, checkedInBy: checkedInBy || null } })
    return { success: true }
}

export async function checkOutChild(formData: FormData) {
    const childId = formData.get('childId') as string
    const checkedOutBy = formData.get('checkedOutBy') as string
    if (!childId) return { error: 'Missing child ID' }

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const record = await prisma.childAttendance.findFirst({
        where: { childId, checkIn: { gte: todayStart }, checkOut: null }
    })
    if (!record) return { error: 'Not currently checked in.' }

    await prisma.childAttendance.update({
        where: { id: record.id },
        data: { checkOut: new Date(), checkedOutBy: checkedOutBy || null }
    })
    return { success: true }
}

// ─────────────────────────────────────────────────────────
// Admin: Guardian CRUD (org-scoped)
// ─────────────────────────────────────────────────────────

function guardianDataFromForm(fd: FormData) {
    return {
        firstName: fd.get('firstName') as string,
        lastName: fd.get('lastName') as string,
        pin: fd.get('pin') as string,
        email: (fd.get('email') as string) || null,
        phone: (fd.get('phone') as string) || null,
        secondaryPhone: (fd.get('secondaryPhone') as string) || null,
        address: (fd.get('address') as string) || null,
        city: (fd.get('city') as string) || null,
        state: (fd.get('state') as string) || null,
        zip: (fd.get('zip') as string) || null,
        driversLicenseId: (fd.get('driversLicenseId') as string) || null,
        relationshipToChild: (fd.get('relationshipToChild') as string) || null,
        guardian2FirstName: (fd.get('guardian2FirstName') as string) || null,
        guardian2LastName: (fd.get('guardian2LastName') as string) || null,
        guardian2Email: (fd.get('guardian2Email') as string) || null,
        guardian2Phone: (fd.get('guardian2Phone') as string) || null,
        guardian2SecondaryPhone: (fd.get('guardian2SecondaryPhone') as string) || null,
        guardian2Address: (fd.get('guardian2Address') as string) || null,
        guardian2City: (fd.get('guardian2City') as string) || null,
        guardian2State: (fd.get('guardian2State') as string) || null,
        guardian2Zip: (fd.get('guardian2Zip') as string) || null,
        guardian2DriversLicenseId: (fd.get('guardian2DriversLicenseId') as string) || null,
        guardian2Relationship: (fd.get('guardian2Relationship') as string) || null,
        notes: (fd.get('notes') as string) || null,
    }
}

export async function createGuardian(formData: FormData) {
    const currentUser = await requireAdmin()
    const organizationId = currentUser.organizationId
    const data = guardianDataFromForm(formData)
    if (!data.firstName || !data.lastName || !data.pin || data.pin.length < 4)
        return { error: 'First name, last name, and 4-digit PIN are required.' }

    const existing = await prisma.guardian.findUnique({
        where: { organizationId_pin: { organizationId, pin: data.pin } }
    })
    if (existing) return { error: 'PIN already in use by another guardian.' }

    const guardian = await prisma.guardian.create({ data: { ...data, organizationId } })
    revalidatePath('/admin/children')
    return { success: true, guardianId: guardian.id }
}

export async function updateGuardian(formData: FormData) {
    const currentUser = await requireAdmin()
    const id = formData.get('id') as string
    if (!id) return { error: 'Missing ID' }

    const guardian = await prisma.guardian.findUnique({ where: { id } })
    if (!guardian || guardian.organizationId !== currentUser.organizationId) {
        return { error: 'Guardian not found' }
    }

    const data = guardianDataFromForm(formData)
    await prisma.guardian.update({ where: { id }, data })
    revalidatePath('/admin/children')
    return { success: true }
}

export async function deleteGuardian(id: string) {
    const currentUser = await requireAdmin()
    const guardian = await prisma.guardian.findUnique({ where: { id } })
    if (!guardian || guardian.organizationId !== currentUser.organizationId) return

    await prisma.$transaction([
        prisma.guardian.update({ where: { id }, data: { isActive: false } }),
        prisma.child.updateMany({ where: { guardianId: id }, data: { isActive: false } })
    ])
    revalidatePath('/admin/children')
}

export async function linkChildToGuardian(childId: string, guardianId: string | null) {
    await requireAdmin()
    await prisma.child.update({ where: { id: childId }, data: { guardianId } })
    revalidatePath('/admin/children')
    return { success: true }
}

// ─────────────────────────────────────────────────────────
// Admin: Child CRUD (org-scoped)
// ─────────────────────────────────────────────────────────

function childDataFromForm(fd: FormData) {
    return {
        firstName: fd.get('firstName') as string,
        lastName: fd.get('lastName') as string,
        gender: (fd.get('gender') as string) || null,
        classroom: (fd.get('classroom') as string) || null,
        locationId: (fd.get('locationId') as string) || null,
        guardianId: (fd.get('guardianId') as string) || null,
        dateOfBirth: fd.get('dateOfBirth') ? new Date(fd.get('dateOfBirth') as string) : null,
        daysOfWeek: (fd.get('daysOfWeek') as string) || null,
        hours: (fd.get('hours') as string) || null,
        livesWith: (fd.get('livesWith') as string) || null,
        custodyPapers: fd.get('custodyPapers') === 'true',
        specialCareNeeds: (fd.get('specialCareNeeds') as string) || null,
        specialCareDetails: (fd.get('specialCareDetails') as string) || null,
        allergies: (fd.get('allergies') as string) || null,
        allergyPlan: (fd.get('allergyPlan') as string) || null,
        school: (fd.get('school') as string) || null,
        schoolPhone: (fd.get('schoolPhone') as string) || null,
        emergencyContact: (fd.get('emergencyContact') as string) || null,
        pickup1FirstName: (fd.get('pickup1FirstName') as string) || null,
        pickup1LastName: (fd.get('pickup1LastName') as string) || null,
        pickup1Phone: (fd.get('pickup1Phone') as string) || null,
        pickup2FirstName: (fd.get('pickup2FirstName') as string) || null,
        pickup2LastName: (fd.get('pickup2LastName') as string) || null,
        pickup2Phone: (fd.get('pickup2Phone') as string) || null,
        pickup3FirstName: (fd.get('pickup3FirstName') as string) || null,
        pickup3LastName: (fd.get('pickup3LastName') as string) || null,
        pickup3Phone: (fd.get('pickup3Phone') as string) || null,
        pickup4FirstName: (fd.get('pickup4FirstName') as string) || null,
        pickup4LastName: (fd.get('pickup4LastName') as string) || null,
        pickup4Phone: (fd.get('pickup4Phone') as string) || null,
        physicianFirstName: (fd.get('physicianFirstName') as string) || null,
        physicianLastName: (fd.get('physicianLastName') as string) || null,
        physicianAddress: (fd.get('physicianAddress') as string) || null,
        physicianPhone: (fd.get('physicianPhone') as string) || null,
        physicianCity: (fd.get('physicianCity') as string) || null,
        physicianState: (fd.get('physicianState') as string) || null,
        hospitalName: (fd.get('hospitalName') as string) || null,
        hospitalPhone: (fd.get('hospitalPhone') as string) || null,
        hospitalAddress: (fd.get('hospitalAddress') as string) || null,
        hospitalCity: (fd.get('hospitalCity') as string) || null,
        hospitalState: (fd.get('hospitalState') as string) || null,
        notes: (fd.get('notes') as string) || null,
    }
}

export async function getActiveChildren() {
    const currentUser = await requireAdmin()
    return prisma.child.findMany({
        where: { isActive: true, organizationId: currentUser.organizationId },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        include: {
            guardian: true,
            location: true,
            attendance: {
                where: { checkIn: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
                orderBy: { checkIn: 'desc' },
                take: 1
            }
        }
    })
}

export async function createChild(formData: FormData) {
    const currentUser = await requireAdmin()
    const data = childDataFromForm(formData)
    if (!data.firstName || !data.lastName) return { error: 'First and last name required.' }
    await prisma.child.create({ data: { ...data, organizationId: currentUser.organizationId } })
    revalidatePath('/admin/children')
    return { success: true }
}

export async function updateChild(formData: FormData) {
    const currentUser = await requireAdmin()
    const id = formData.get('id') as string
    if (!id) return { error: 'Missing ID' }

    const child = await prisma.child.findUnique({ where: { id } })
    if (!child || child.organizationId !== currentUser.organizationId) {
        return { error: 'Child not found' }
    }

    const data = childDataFromForm(formData)
    await prisma.child.update({ where: { id }, data })
    revalidatePath(`/admin/children/${id}`)
    revalidatePath('/admin/children')
    return { success: true }
}

export async function deleteChild(formData: FormData) {
    const currentUser = await requireAdmin()
    const id = formData.get('id') as string
    if (!id) return { error: 'Missing ID' }

    const child = await prisma.child.findUnique({ where: { id } })
    if (!child || child.organizationId !== currentUser.organizationId) {
        return { error: 'Child not found' }
    }

    await prisma.child.update({ where: { id }, data: { isActive: false } })
    revalidatePath('/admin/children')
    return { success: true }
}

export async function getTodayAttendance() {
    const currentUser = await requireAdmin()
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    return prisma.childAttendance.findMany({
        where: {
            checkIn: { gte: todayStart },
            child: { organizationId: currentUser.organizationId }
        },
        include: { child: { include: { guardian: true, location: true } } },
        orderBy: { checkIn: 'asc' }
    })
}

// ─────────────────────────────────────────────────────────
// CSV Export / Import (org-scoped)  
// ─────────────────────────────────────────────────────────

export async function exportChildrenCsv() {
    const currentUser = await requireAdmin()
    const children = await prisma.child.findMany({
        where: { isActive: true, organizationId: currentUser.organizationId },
        orderBy: [{ lastName: 'asc' }],
        include: { guardian: true, location: true }
    })
    const headers = [
        'firstName','lastName','dateOfBirth','gender','classroom','location',
        'daysOfWeek','hours','livesWith','custodyPapers',
        'specialCareNeeds','specialCareDetails','allergies','allergyPlan',
        'school','schoolPhone',
        'pickup1FirstName','pickup1LastName','pickup1Phone',
        'pickup2FirstName','pickup2LastName','pickup2Phone',
        'pickup3FirstName','pickup3LastName','pickup3Phone',
        'pickup4FirstName','pickup4LastName','pickup4Phone',
        'emergencyContact',
        'physicianFirstName','physicianLastName','physicianPhone','physicianCity',
        'hospitalName','hospitalPhone','hospitalCity',
        'notes',
        'guardianPin'
    ]
    const rows = children.map(c => headers.map(h => {
        let val: any
        if (h === 'guardianPin') val = c.guardian?.pin
        else if (h === 'location') val = c.location?.name
        else val = (c as any)[h]
        if (val === null || val === undefined) return ''
        if (val instanceof Date) return val.toISOString().split('T')[0]
        if (typeof val === 'boolean') return String(val)
        return `"${String(val).replace(/"/g, '""')}"`
    }).join(','))
    return [headers.join(','), ...rows].join('\n')
}

export async function importChildrenCsv(csvText: string) {
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
            if (!row.firstName || !row.lastName) { errors++; continue }

            let guardianId: string | null = null
            if (row.guardianPin) {
                const g = await prisma.guardian.findUnique({
                    where: { organizationId_pin: { organizationId, pin: row.guardianPin } }
                })
                if (g) guardianId = g.id
            }

            await prisma.child.create({
                data: {
                    organizationId,
                    firstName: row.firstName, lastName: row.lastName,
                    gender: row.gender || null,
                    classroom: row.classroom || null,
                    dateOfBirth: row.dateOfBirth ? new Date(row.dateOfBirth) : null,
                    daysOfWeek: row.daysOfWeek || null,
                    hours: row.hours || null,
                    allergies: row.allergies || null,
                    notes: row.notes || null,
                    guardianId,
                }
            })
            created++
        } catch { errors++ }
    }
    revalidatePath('/admin/children')
    return { created, errors }
}
