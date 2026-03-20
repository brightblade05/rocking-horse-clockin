/**
 * Import script for Rocking Horse Yearly Paperwork Google Form responses.
 * Usage: node scripts/import-enrollment-csv.mjs "/path/to/file.csv"
 *
 * What it does:
 *  - Parses the enrollment form CSV (Google Form response format)
 *  - Creates one Guardian per unique parent email (deduplicates)
 *  - Assigns each Guardian a unique 4-digit PIN
 *  - Creates Child records for Child 1-4 in each row
 *  - Links each child to their guardian
 *  - Skips rows already in DB (by child first+last+DOB+guardianEmail)
 */

import { PrismaClient } from '@prisma/client'
import { createReadStream } from 'fs'
import { readFile } from 'fs/promises'
import path from 'path'

const prisma = new PrismaClient()

// ─── CSV Parser (handles quoted fields with commas) ───────────────────────────
function parseCSVLine(line) {
    const fields = []
    let current = ''
    let inQuote = false
    for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (ch === '"') {
            if (inQuote && line[i + 1] === '"') { current += '"'; i++ }
            else inQuote = !inQuote
        } else if (ch === ',' && !inQuote) {
            fields.push(current.trim())
            current = ''
        } else {
            current += ch
        }
    }
    fields.push(current.trim())
    return fields
}

function clean(val) { return (val || '').trim() }
function yn(val) { const v = clean(val).toLowerCase(); return v.includes('yes') || v.includes('x  yes') }

// Map age group text → classroom name
function ageToClassroom(ageText) {
    const t = clean(ageText).toLowerCase()
    if (t.includes('6 week') || t.includes('12 month') && t.includes('6')) return 'Tadpoles (6 Weeks - 12 Months)'
    if (t.includes('12') && t.includes('18')) return 'Teddy Bears (12 - 22 Months)'
    if (t.includes('18') && t.includes('2 year')) return 'Teddy Bears (12 - 22 Months)'
    if (t.includes('22') || t.includes('potty')) return 'Busy Bees (22 Months - Potty Trained)'
    if (t === '2') return 'Busy Bees (22 Months - Potty Trained)'
    if (t === '3' || t.includes('loli')) return 'Loli Pops (3 Year Olds)'
    if (t === '4' || t.includes('sugar')) return 'Sugar Bears (4 Year Olds)'
    if (t === '5' || t.includes('rascal') || t.includes('5 year')) return 'Rascals (5 Year Olds)'
    if (t.includes('kinder') || t.includes('1st') || t.includes('2nd') || t.includes('3rd') ||
        t.includes('4th') || t.includes('5th') || t.includes('school')) return 'School Kids'
    return ageText || null
}

// ─── PIN generator ─────────────────────────────────────────────────────────────
const usedPins = new Set()
async function loadExistingPins() {
    const gs = await prisma.guardian.findMany({ select: { pin: true } })
    gs.forEach(g => usedPins.add(g.pin))
}
function generatePin() {
    let pin
    let attempts = 0
    do {
        pin = String(Math.floor(1000 + Math.random() * 9000))
        attempts++
        if (attempts > 9000) throw new Error('Ran out of unique PINs!')
    } while (usedPins.has(pin))
    usedPins.add(pin)
    return pin
}

// ─── Guardian upsert (deduplicates by email) ──────────────────────────────────
const guardianCache = {} // email → guardian id
async function getOrCreateGuardian(row, headers) {
    const get = (name) => clean(row[headers.indexOf(name)] ?? '')

    const email   = get('Parent/Guardian 1 Email') || get('Email Address')
    const phone   = get('Parent/Guardian 1 Phone Number')
    const fname   = get('Parent/Guardian 1 First Name')
    const lname   = get('Parent/Guardian 1 Last Name')
    const address = get('Parent/Guardian 1 Street Address')
    const city    = get('Parent/Guardian 1 City')
    const state   = get('Parent/Guardian 1 State')
    const zip     = get('Parent/Guardian 1 Zip')
    const dlNum   = get('Parent/Guardian 1 TDL#')
    const secPh   = get('Parent/Guardian 1 Secondary Phone Number')
    const rel1    = get('Parent/Guardian 1 Relationship to Child')

    const g2fname = get('ParentGuardian 2 First Name')
    const g2lname = get('ParentGuardian 2 Last Name')
    const g2email = get('Parent/Guardian 2 Email')
    const g2phone = get('Parent/Guardian 2 Primary Phone Number')
    const g2secph = get('Parent/Guardian 2 Secondary Phone')
    const g2addr  = get('Parent/Guardian 2 Address')
    const g2city  = get('Parent/Guardian 2 City')
    const g2state = get('Parent/Guardian 2 State')
    const g2zip   = get('Parent/Guardian 2 Zip')
    const g2dl    = get('Parent/Guardian 2 TDL#')
    const g2rel   = get('ParentGuardian 2 Relationship to child')

    if (!fname && !lname && !email) return null

    const cacheKey = email || `${fname}|${lname}|${phone}`

    if (guardianCache[cacheKey]) return guardianCache[cacheKey]

    // Check DB
    let existing = null
    if (email) {
        existing = await prisma.guardian.findFirst({ where: { email } })
    }
    if (!existing && fname && lname) {
        existing = await prisma.guardian.findFirst({ where: { firstName: fname, lastName: lname } })
    }

    if (existing) {
        guardianCache[cacheKey] = existing.id
        return existing.id
    }

    const pin = generatePin()
    const g = await prisma.guardian.create({
        data: {
            firstName: fname || '(Unknown)',
            lastName:  lname || '(Unknown)',
            pin,
            email:     email || null,
            phone:     phone || null,
            secondaryPhone: secPh || null,
            address:   address || null,
            city:      city || null,
            state:     state || null,
            zip:       zip || null,
            driversLicenseId: dlNum || null,
            relationshipToChild: rel1 || null,
            guardian2FirstName:  g2fname || null,
            guardian2LastName:   g2lname || null,
            guardian2Email:      g2email || null,
            guardian2Phone:      g2phone || null,
            guardian2SecondaryPhone: g2secph || null,
            guardian2Address:    g2addr || null,
            guardian2City:       g2city || null,
            guardian2State:      g2state || null,
            guardian2Zip:        g2zip || null,
            guardian2DriversLicenseId: g2dl || null,
            guardian2Relationship: g2rel || null,
        }
    })

    guardianCache[cacheKey] = g.id
    console.log(`  ✓ Guardian: ${fname} ${lname} — PIN: ${pin}`)
    return g.id
}

// ─── Child upsert ─────────────────────────────────────────────────────────────
async function upsertChild(data, guardianId, location) {
    if (!data.firstName || data.firstName.toLowerCase() === 'n/a') return
    if (!data.lastName) return

    const existing = await prisma.child.findFirst({
        where: {
            firstName: data.firstName,
            lastName: data.lastName,
            guardianId: guardianId ?? undefined,
        }
    })
    if (existing) {
        console.log(`  ~ Skip (exists): ${data.firstName} ${data.lastName}`)
        return
    }

    await prisma.child.create({
        data: {
            ...data,
            guardianId: guardianId || null,
            location: location || null,
        }
    })
    console.log(`  ✓ Child: ${data.firstName} ${data.lastName}`)
}

// ─── Build child data from column offset ─────────────────────────────────────
// childNum 1,2,3,4 → maps to the right column group
function extractChild(row, headers, childNum, pickup, physician, hospital) {
    const cn = childNum
    const get = (label) => {
        const idx = headers.indexOf(label)
        return idx >= 0 ? clean(row[idx] ?? '') : ''
    }
    const getc = (label) => {
        // child-specific label
        const idx = headers.findIndex(h => h === label)
        return idx >= 0 ? clean(row[idx] ?? '') : ''
    }

    // Each child group uses the exact column names from the header
    const prefix = (n, field) => `Child ${n} ${field}`
    const fName = get(prefix(cn, 'First Name')) || (cn === 1 ? '' : '')
    const lName = get(prefix(cn, 'Last Name')) || ''

    // Try alternate naming for child 2+ ("Child 2 First Name" vs "Child 1 First Name")
    if (!fName && !lName) return null

    const dob = get(prefix(cn, 'Date of Birth'))
    const gender = get(prefix(cn, 'Gender'))
    const ageText = get(prefix(cn, 'Age as of September 1'))
    const days   = cn === 1 ? get('Child 1 Days of the Week for Attendance') : get(prefix(cn, 'Days of the Week for Attendance'))
    const hrs    = cn === 1 ? get('Child 1 Hours') : get(prefix(cn, 'Hours'))
    const lives  = cn === 1 ? get('Child 1 lives with:') : get(prefix(cn, 'lives with:')) || get(prefix(cn, 'lives with'))
    const cust   = cn === 1 ? get('Child 1 Custody papers on file?') : get(prefix(cn, 'Custody papers on file?'))
    const care   = cn === 1 ? get('Child 1 Special Care Needs') : get(prefix(cn, "Special Care Needs")) || get(`Child ${cn}'s Special Care Needs`)
    const careDetail = cn === 1 ? get('Child 1 - Please explain the special care needs') : get(prefix(cn, '- Please explain the special care needs'))
    const allergy = cn === 1 ? get('Child 1 diagnosed food allergies') : get(prefix(cn, 'diagnosed food allergies'))
    const allergyPlan = cn === 1 ? get('Child 1 Food Allergy Plan') : get(prefix(cn, 'Food Allergy Plan'))
    const school = cn === 1 ? get('Child 1 School') : get(prefix(cn, 'School'))
    const schoolPh = cn === 1 ? get('Child 1 School Phone Number') : get(prefix(cn, 'School Phone Number'))

    return {
        firstName: fName,
        lastName: lName,
        dateOfBirth: dob ? new Date(dob) : null,
        gender: gender || null,
        classroom: ageToClassroom(ageText),
        daysOfWeek: days || null,
        hours: hrs || null,
        livesWith: lives || null,
        custodyPapers: yn(cust),
        specialCareNeeds: care || null,
        specialCareDetails: careDetail || null,
        allergies: allergy && allergy.toLowerCase() !== 'no' && allergy.toLowerCase() !== 'none' ? allergy : null,
        allergyPlan: allergyPlan || null,
        school: school || null,
        schoolPhone: schoolPh || null,
        ...pickup,
        ...physician,
        ...hospital,
    }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
    const filePath = process.argv[2]
    if (!filePath) {
        console.error('Usage: node scripts/import-enrollment-csv.mjs "/path/to/file.csv"')
        process.exit(1)
    }

    console.log(`\nReading: ${filePath}\n`)
    const raw = await readFile(filePath, 'utf8')

    // Split into lines, preserving quoted newlines
    const lines = []
    let current = ''
    let inQ = false
    for (const ch of raw) {
        if (ch === '"') inQ = !inQ
        if ((ch === '\n' || ch === '\r') && !inQ) {
            if (current.trim()) lines.push(current)
            current = ''
        } else {
            current += ch
        }
    }
    if (current.trim()) lines.push(current)

    if (lines.length < 2) { console.error('Empty CSV'); process.exit(1) }

    const headers = parseCSVLine(lines[0])
    console.log(`Columns detected: ${headers.length}`)
    console.log(`Data rows: ${lines.length - 1}\n`)

    await loadExistingPins()

    let created = 0, skipped = 0, errors = 0

    for (let i = 1; i < lines.length; i++) {
        const row = parseCSVLine(lines[i])
        const get = (label) => {
            const idx = headers.indexOf(label)
            return idx >= 0 ? clean(row[idx] ?? '') : ''
        }

        const location = get('Select the location your child attends')
        if (!get('Child 1 First Name') && !get('Child 1 Last Name')) { skipped++; continue }

        try {
            console.log(`\nRow ${i}: ${get('Child 1 First Name')} ${get('Child 1 Last Name')} (${location})`)

            // ── Guardian ──
            const guardianId = await getOrCreateGuardian(row, headers)

            // ── Pickup persons ──
            const pickup = {
                pickup1FirstName: get('Pick up Person 1 First name') || null,
                pickup1LastName:  get('Pick up Person 1 Last name') || null,
                pickup1Phone:     get('Pick up Person 1 Cell Phone Number') || null,
                pickup1WorkPhone: get('Pick up Person 1 Work Phone Number') || null,
                pickup2FirstName: get('Pick up Person 2 First name') || null,
                pickup2LastName:  get('Pick up Person 2 Last name') || null,
                pickup2Phone:     get('Pick up Person 2 Phone Number') || null,
                pickup2WorkPhone: get('Pick up Person 2 Work Phone Number') || null,
                pickup3FirstName: get('Pick up Person 3 First name') || null,
                pickup3LastName:  get('Pick up Person 3 Last name') || null,
                pickup3Phone:     get('Pick up Person 3 Phone Number') || null,
                pickup3WorkPhone: get('Pick up Person 3 Work Phone Number') || null,
                pickup4FirstName: get('Pick up Person 4 First name') || null,
                pickup4LastName:  get('Pick up Person 4 Last name') || null,
                pickup4Phone:     get('Pick up Person 4 Phone Number') || null,
                pickup4WorkPhone: get('Pick up Person 4 Work Phone Number') || null,
                emergencyContact: [
                    get('Emergency Contact First Name'),
                    get('Emergency Contact Last Name'),
                    get('Emergency Contact Relationship to child'),
                    get('Emergency Contact Phone Number')
                ].filter(Boolean).join(' · ') || null,
            }

            // ── Physician ──
            const physician = {
                physicianFirstName: get('Licensed Physician First Name') || null,
                physicianLastName:  get('Licensed Physician Last Name') || null,
                physicianAddress:   get('Licensed Physician Office Address') || null,
                physicianPhone:     get('Licensed Physician Phone Number') || null,
                physicianCity:      get('Licensed Physician Office City') || null,
                physicianState:     get('Licensed Physician Office State') || null,
            }

            // ── Hospital ──
            const hospital = {
                hospitalName:    get('Preferred Hospital/Clinic') || null,
                hospitalPhone:   get('Hospital/Clinic Phone Number') || null,
                hospitalAddress: get('Hospital/Clinic Street Address') || null,
                hospitalCity:    get('Hospital/Clinic City') || null,
                hospitalState:   get('Hospital/Clinic State') || null,
            }

            // ── Child 1 ──
            const c1 = extractChild(row, headers, 1, pickup, physician, hospital)
            if (c1) { await upsertChild(c1, guardianId, location); created++ }

            // ── Child 2 ──
            const c2 = extractChild(row, headers, 2, {}, physician, hospital)
            if (c2) { await upsertChild(c2, guardianId, location); created++ }

            // ── Child 3 ──
            const c3 = extractChild(row, headers, 3, {}, physician, hospital)
            if (c3) { await upsertChild(c3, guardianId, location); created++ }

            // ── Child 4 ──
            const c4 = extractChild(row, headers, 4, {}, physician, hospital)
            if (c4) { await upsertChild(c4, guardianId, location); created++ }

        } catch (err) {
            console.error(`  ✗ Error row ${i}:`, err.message)
            errors++
        }
    }

    console.log(`\n${'─'.repeat(50)}`)
    console.log(`✅ Done! Children created/updated: ${created}`)
    console.log(`⚠  Skipped (no name):              ${skipped}`)
    console.log(`✗  Errors:                          ${errors}`)
    console.log(`\nGuardians created this run:        ${Object.keys(guardianCache).length}`)
    console.log(`${'─'.repeat(50)}\n`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
