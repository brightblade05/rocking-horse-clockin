const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    // 1. Create Roles
    const busDriver = await prisma.role.upsert({
        where: { name: 'Bus Driver' },
        update: {},
        create: { name: 'Bus Driver' },
    })

    const leadTeacher = await prisma.role.upsert({
        where: { name: 'Lead Teacher' },
        update: {},
        create: { name: 'Lead Teacher' },
    })

    // 2. Create Admin
    const admin = await prisma.user.upsert({
        where: { pin: '9999' },
        update: {
            password: 'password123'
        },
        create: {
            name: 'System Admin',
            pin: '9999',
            isAdmin: true,
            email: 'admin@rockinghorse.com',
            password: 'password123',
            baseRate: 0,
        },
    })

    // 3. Create Sara ($15 base, $25 Bus)
    const sara = await prisma.user.upsert({
        where: { pin: '1111' },
        update: {},
        create: {
            name: 'Sara',
            pin: '1111',
            baseRate: 15.00,
        },
    })

    // Assign Bus Role to Sara with custom rate
    await prisma.userRole.upsert({
        where: {
            userId_roleId: {
                userId: sara.id,
                roleId: busDriver.id
            }
        },
        update: {},
        create: {
            userId: sara.id,
            roleId: busDriver.id,
            rate: 25.00 // Special rate
        }
    })

    // 4. Create Ashley ($15.35 base, $25 Bus)
    const ashley = await prisma.user.upsert({
        where: { pin: '2222' },
        update: {},
        create: {
            name: 'Ashley',
            pin: '2222',
            baseRate: 15.35,
        },
    })

    // Assign Bus Role to Ashley with same special rate
    await prisma.userRole.upsert({
        where: {
            userId_roleId: {
                userId: ashley.id,
                roleId: busDriver.id
            }
        },
        update: {},
        create: {
            userId: ashley.id,
            roleId: busDriver.id,
            rate: 25.00
        }
    })

    console.log('Seed data created: Sara, Ashley, Admin(9999)')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
