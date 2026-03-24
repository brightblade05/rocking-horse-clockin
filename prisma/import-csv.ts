import fs from 'fs'
import { parse } from 'csv-parse/sync'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Path to the CSV file
const CSV_FILE_PATH = '/Users/mactop/Downloads/Copy of Rocking Horse Yearly Paperwork (Responses) - Form Responses 1.csv'

async function generateUniquePin(orgId: string): Promise<string> {
    while (true) {
        const pin = Math.floor(1000 + Math.random() * 9000).toString()
        const existing = await prisma.guardian.findUnique({
            where: { organizationId_pin: { organizationId: orgId, pin } }
        })
        if (!existing) return pin
    }
}

async function main() {
    console.log('Reading CSV from', CSV_FILE_PATH)
    const fileContent = fs.readFileSync(CSV_FILE_PATH, 'utf-8')

    const records: Record<string, string>[] = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        relax_column_count: true
    })

    console.log(`Parsed ${records.length} records`)

    const org = await prisma.organization.findUnique({
        where: { slug: 'rocking-horse' }
    })

    if (!org) {
        throw new Error('Organization "rocking-horse" not found. Run seed first.')
    }

    const locations = await prisma.location.findMany({
        where: { organizationId: org.id }
    })
    
    // Create a map to easily resolve location ID by substring
    const locationMap = new Map<string, string>()
    for (const loc of locations) {
        locationMap.set(loc.name.toLowerCase(), loc.id)
    }

    let guardiansCreated = 0
    let childrenCreated = 0

    for (let i = 0; i < records.length; i++) {
        const row = records[i]
        try {
            // Find location matching 'Location' column
            const rowLoc = (row['Location'] || '').toLowerCase()
            let locationId: string | null = null
            for (const [name, id] of locationMap.entries()) {
                if (rowLoc.includes(name)) locationId = id
            }

            // GUARDIAN 1
            const g1First = row['Parent/Guardian 1 First Name']?.trim()
            const g1Last = row['Parent/Guardian 1 Last Name']?.trim()
            let guardian1 = null
            if (g1First && g1Last) {
                const pin = await generateUniquePin(org.id)
                guardian1 = await prisma.guardian.create({
                    data: {
                        organizationId: org.id,
                        firstName: g1First,
                        lastName: g1Last,
                        email: row['Parent/Guardian 1 Email']?.trim() || null,
                        phone: row['Parent/Guardian 1 Phone Number']?.trim() || null,
                        address: row['Parent/Guardian 1 Street Address']?.trim() || null,
                        pin
                    }
                })
                guardiansCreated++
            }

            // GUARDIAN 2
            const g2First = row['ParentGuardian 2 First Name']?.trim()
            const g2Last = row['ParentGuardian 2 Last Name']?.trim()
            let guardian2 = null
            if (g2First && g2Last) {
                const pin = await generateUniquePin(org.id)
                guardian2 = await prisma.guardian.create({
                    data: {
                        organizationId: org.id,
                        firstName: g2First,
                        lastName: g2Last,
                        email: row['Parent/Guardian 2 Email']?.trim() || null,
                        phone: row['Parent/Guardian 2 Primary Phone Number']?.trim() || null,
                        address: row['Parent/Guardian 2 Address']?.trim() || null,
                        pin
                    }
                })
                guardiansCreated++
            }

            // Children Mapping (1 to 4)
            const childrenFields = [
                {
                    first: "Child 1 First Name", last: "Child 1 Last Name",
                    dob: "Child 1 Date of Birth", special: "Child 1's Special Care Needs",
                    allergies: "Child 1 diagnosed food allergies", school: "Child 1 School"
                },
                {
                    first: "Child 2 First Name", last: "Child 2 Last Name",
                    dob: "Child 2 Date of Birth", special: "Child 2's Special Care Needs",
                    allergies: "Child 2 diagnosed food allergies", school: "Child 2 School"
                },
                {
                    first: "Child 3 First Name", last: "Child 3 Last Name",
                    dob: "Child 3 Date of Birth", special: "Child 3's Special Care Needs",
                    allergies: "Child 3 diagnosed food allergies", school: "Child 3 School"
                },
                {
                    first: "Child 4 First Name", last: "Child 4 Last Name",
                    dob: "Child 4 Date of Birth", special: "Child 4's Special Care Needs",
                    allergies: "Child 4 diagnosed food allergies", school: "Child 4 School"
                }
            ]

            for (const fields of childrenFields) {
                const first = row[fields.first]?.trim()
                const last = row[fields.last]?.trim()
                if (first && last) {
                    let dateOfBirth: Date | null = null
                    if (row[fields.dob]) {
                        try { dateOfBirth = new Date(row[fields.dob]) } catch (e) { }
                    }

                    // For the classroom, we can parse it from Age/Room column if it existed,
                    // but we will insert what we have, leaving classroom null or using 'school'
                    const allergies = row[fields.allergies]?.trim() || null

                    // Link child to Guardian 1 primarily
                    const guardianId = guardian1?.id || guardian2?.id || null

                    await prisma.child.create({
                        data: {
                            organizationId: org.id,
                            locationId,
                            guardianId,
                            firstName: first,
                            lastName: last,
                            dateOfBirth,
                            allergies
                        }
                    })
                    childrenCreated++
                }
            }
        } catch (err) {
            console.error(`Error processing row ${i + 2}:`, err)
        }
    }

    console.log(`✅ Import complete! Created ${guardiansCreated} guardians and ${childrenCreated} children.`)
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
