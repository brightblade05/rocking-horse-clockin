import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const email = process.env.MASTER_ADMIN_EMAIL
    const password = process.env.MASTER_ADMIN_PASSWORD
    const name = process.env.MASTER_ADMIN_NAME || 'Master Admin'

    if (!email || !password) {
        console.error('❌ MASTER_ADMIN_EMAIL and MASTER_ADMIN_PASSWORD must be set in .env')
        process.exit(1)
    }

    // Check if master admin already exists
    const existing = await prisma.masterAdmin.findUnique({ where: { email } })
    if (existing) {
        console.log(`✅ Master admin already exists: ${email}`)
        return
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    await prisma.masterAdmin.create({
        data: {
            email,
            password: hashedPassword,
            name,
        }
    })

    console.log(`✅ Master admin created: ${email}`)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
