import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()
const SALT = 12

async function main() {
    console.log('🌱 Seeding database...')

    // ── 1. Master Admin ────────────────────────────
    const masterPassword = await bcrypt.hash(process.env.MASTER_ADMIN_PASSWORD || 'Eight1812!', SALT)
    const master = await prisma.masterAdmin.upsert({
        where: { email: process.env.MASTER_ADMIN_EMAIL || 'sam@caster.consulting' },
        update: { password: masterPassword },
        create: {
            email: process.env.MASTER_ADMIN_EMAIL || 'sam@caster.consulting',
            password: masterPassword,
            name: process.env.MASTER_ADMIN_NAME || 'Sam',
        },
    })
    console.log('  ✅ MasterAdmin:', master.email)

    // ── 2. Organization ────────────────────────────
    const org = await prisma.organization.upsert({
        where: { slug: 'rocking-horse' },
        update: {},
        create: {
            name: 'Rocking Horse Daycare',
            slug: 'rocking-horse',
        },
    })
    console.log('  ✅ Organization:', org.name)

    // ── 3. Locations ───────────────────────────────
    const porterLoc = await prisma.location.upsert({
        where: { organizationId_name: { organizationId: org.id, name: 'Porter' } },
        update: {},
        create: {
            organizationId: org.id,
            name: 'Porter',
            address: '24375 FM 1314, Porter, TX 77365',
            phone: '281-354-5663',
        },
    })

    const newCaneyLoc = await prisma.location.upsert({
        where: { organizationId_name: { organizationId: org.id, name: 'New Caney' } },
        update: {},
        create: {
            organizationId: org.id,
            name: 'New Caney',
            address: '21575 US-59, New Caney, TX 77357',
            phone: '281-399-8886',
        },
    })
    console.log('  ✅ Locations: Porter, New Caney')

    // ── 4. Roles ───────────────────────────────────
    const roleData = [
        { name: 'Bus Driver', description: 'Drives children to and from school', defaultRate: 25.00 },
        { name: 'Lead Teacher', description: 'Primary classroom teacher', defaultRate: 18.00 },
        { name: 'Assistant Teacher', description: 'Assists lead teachers', defaultRate: 15.00 },
        { name: 'Cook', description: 'Prepares meals and snacks', defaultRate: 16.00 },
        { name: 'Front Desk', description: 'Reception and administration', defaultRate: 14.50 },
        { name: 'Janitor', description: 'Custodial and maintenance', defaultRate: 14.00 },
    ]

    const roles: Record<string, { id: string }> = {}
    for (const r of roleData) {
        const role = await prisma.role.upsert({
            where: { organizationId_name: { organizationId: org.id, name: r.name } },
            update: {},
            create: { organizationId: org.id, ...r },
        })
        roles[r.name] = role
    }
    console.log('  ✅ Roles:', Object.keys(roles).join(', '))

    // ── 5. Employees (8 total) ─────────────────────
    const adminPassword = await bcrypt.hash('admin123!', SALT)

    const employees = [
        {
            name: 'Tia Caster',
            pin: '9999',
            email: 'tia@caster.consulting',
            password: adminPassword,
            isAdmin: true,
            adminRole: 'SUPERADMIN',
            baseRate: 0,
            employmentType: 'FULL_TIME',
            locationId: null,
            roleName: 'Front Desk',
            phone: '940-312-9772',
        },
        {
            name: 'Maria Garcia',
            pin: '1001',
            email: 'maria@rockinghorse.com',
            password: adminPassword,
            isAdmin: true,
            adminRole: 'MANAGER',
            baseRate: 20.00,
            employmentType: 'FULL_TIME',
            locationId: newCaneyLoc.id,
            roleName: 'Lead Teacher',
            phone: '832-555-0101',
        },
        {
            name: 'Sara Johnson',
            pin: '1111',
            email: null,
            password: null,
            isAdmin: false,
            adminRole: 'NONE',
            baseRate: 15.00,
            employmentType: 'FULL_TIME',
            locationId: porterLoc.id,
            roleName: 'Bus Driver',
            phone: '281-555-0201',
        },
        {
            name: 'Ashley Williams',
            pin: '2222',
            email: null,
            password: null,
            isAdmin: false,
            adminRole: 'NONE',
            baseRate: 15.35,
            employmentType: 'FULL_TIME',
            locationId: porterLoc.id,
            roleName: 'Bus Driver',
            phone: '281-555-0202',
        },
        {
            name: 'David Chen',
            pin: '3333',
            email: null,
            password: null,
            isAdmin: false,
            adminRole: 'NONE',
            baseRate: 18.00,
            employmentType: 'FULL_TIME',
            locationId: newCaneyLoc.id,
            roleName: 'Lead Teacher',
            phone: '832-555-0301',
        },
        {
            name: 'Rosa Martinez',
            pin: '4444',
            email: null,
            password: null,
            isAdmin: false,
            adminRole: 'NONE',
            baseRate: 15.00,
            employmentType: 'FULL_TIME',
            locationId: newCaneyLoc.id,
            roleName: 'Assistant Teacher',
            phone: '281-555-0401',
        },
        {
            name: 'James Wilson',
            pin: '5555',
            email: null,
            password: null,
            isAdmin: false,
            adminRole: 'NONE',
            baseRate: 16.00,
            employmentType: 'FULL_TIME',
            locationId: porterLoc.id,
            roleName: 'Cook',
            phone: '832-555-0501',
        },
        {
            name: 'Linda Brown',
            pin: '6666',
            email: null,
            password: null,
            isAdmin: false,
            adminRole: 'NONE',
            baseRate: 14.00,
            employmentType: 'PART_TIME',
            locationId: newCaneyLoc.id,
            roleName: 'Janitor',
            phone: '281-555-0601',
        },
    ]

    for (const emp of employees) {
        const { roleName, ...userData } = emp
        const user = await prisma.user.upsert({
            where: { organizationId_pin: { organizationId: org.id, pin: emp.pin } },
            update: {},
            create: {
                organizationId: org.id,
                ...userData,
                hireDate: new Date('2024-01-15'),
            },
        })

        // Assign the primary role
        const role = roles[roleName]
        if (role) {
            await prisma.userRole.upsert({
                where: { userId_roleId: { userId: user.id, roleId: role.id } },
                update: {},
                create: {
                    userId: user.id,
                    roleId: role.id,
                    rate: emp.baseRate || (roleData.find(r => r.name === roleName)?.defaultRate || 15.00),
                },
            })
        }

        console.log(`  ✅ Employee: ${emp.name} (PIN: ${emp.pin}) — ${roleName}`)
    }

    console.log('\n🎉 Seed complete!')
    console.log('  Master Admin: sam@caster.consulting / Eight1812!')
    console.log('  Org Admin: tia@caster.consulting / admin123!')
    console.log('  Manager: maria@rockinghorse.com / admin123!')
}

main()
    .then(async () => { await prisma.$disconnect() })
    .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
