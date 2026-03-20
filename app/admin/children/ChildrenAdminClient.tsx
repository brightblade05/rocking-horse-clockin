'use client'

import { useState } from 'react'
import { createChild, updateChild, deleteChild, createGuardian, updateGuardian, deleteGuardian, importChildrenCsv, exportChildrenCsv } from '@/app/actions/children'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Guardian = {
    id: string; firstName: string; lastName: string; pin: string
    phone: string | null; email: string | null
    guardian2FirstName: string | null; guardian2LastName: string | null; guardian2Phone: string | null
    _count: { children: number }
}
type Child = {
    id: string; firstName: string; lastName: string
    classroom: string | null; location: string | null
    allergies: string | null; notes: string | null
    guardian: Guardian | null
    gender: string | null
    daysOfWeek: string | null
    hours: string | null
}
type Attendance = {
    id: string; checkIn: Date; checkOut: Date | null
    checkedInBy: string | null; checkedOutBy: string | null
    child: { firstName: string; lastName: string; guardian: { firstName: string; lastName: string } | null }
}

type Props = { children: Child[]; guardians: Guardian[]; todayAttendance: Attendance[]; showArchived?: boolean }

const DEFAULT_CLASSROOMS = ['Tadpoles (6 Weeks - 12 Months)', 'Teddy Bears (12 - 22 Months)', 'Busy Bees (22 Months - Potty Trained)', 'Loli Pops (3 Year Olds)', 'Sugar Bears (4 Year Olds)', 'Rascals (5 Year Olds)', 'School Kids']
const DEFAULT_LOCATIONS = ['New Caney', 'Porter', 'Splendora', 'Kings Manor']

export default function ChildrenAdminClient({ children, guardians, todayAttendance, showArchived = false }: Props) {
    const router = useRouter()
    // Dynamically pull all unique locations and classrooms from data so custom ones like "Kings Manor" show up
    const locations = Array.from(new Set([...DEFAULT_LOCATIONS, ...children.map(c => c.location).filter(Boolean)])).sort() as string[]
    const classrooms = Array.from(new Set([...DEFAULT_CLASSROOMS, ...children.map(c => c.classroom).filter(Boolean)])).sort() as string[]

    const [tab, setTab] = useState<'roster' | 'guardians' | 'today'>('roster')
    const [childModal, setChildModal] = useState(false)
    const [editChild, setEditChild] = useState<Child | null>(null)
    const [guardianModal, setGuardianModal] = useState(false)
    const [editGuardian, setEditGuardian] = useState<Guardian | null>(null)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [importMsg, setImportMsg] = useState('')

    // ── Children Filter / Sort / Pagination ──
    const [search, setSearch] = useState('')
    const [filterLocation, setFilterLocation] = useState('')
    const [filterClassroom, setFilterClassroom] = useState('')
    const [filterAllergies, setFilterAllergies] = useState(false)
    const [cSortCol, setCSortCol] = useState<'name' | 'location' | 'classroom' | 'guardian' | 'allergies'>('name')
    const [cSortAsc, setCSortAsc] = useState(true)
    const [page, setPage] = useState(1)
    const PAGE_SIZE = 50

    // ── Guardian Filter / Sort / Pagination ──
    const [gSearch, setGSearch] = useState('')
    const [gFilterLinked, setGFilterLinked] = useState<'' | 'linked' | 'unlinked'>('')
    const [gSortCol, setGSortCol] = useState<'name' | 'pin' | 'phone' | 'email' | 'guardian2' | 'children'>('name')
    const [gSortAsc, setGSortAsc] = useState(true)
    const [gPage, setGPage] = useState(1)
    const G_PAGE_SIZE = 50

    const BLANK_C = {
        firstName: '', lastName: '', gender: '', classroom: '', location: '',
        guardianId: '', daysOfWeek: '', hours: '',
        allergies: '', notes: ''
    }
    const [childForm, setChildForm] = useState(BLANK_C)

    const [guardianForm, setGuardianForm] = useState({
        firstName: '', lastName: '', pin: '', email: '', phone: '', secondaryPhone: '',
        address: '', city: '', state: '', zip: '', relationshipToChild: '',
        guardian2FirstName: '', guardian2LastName: '', guardian2Email: '', guardian2Phone: '',
        guardian2Relationship: '', notes: ''
    })

    const todayPresent = todayAttendance.filter(a => !a.checkOut)
    const todayGone = todayAttendance.filter(a => a.checkOut)

    // ── Filtered + sorted children ──
    const filtered = children
        .filter(c => {
            const fullName = `${c.firstName} ${c.lastName}`.toLowerCase()
            const guardianName = c.guardian ? `${c.guardian.firstName} ${c.guardian.lastName}`.toLowerCase() : ''
            const q = search.toLowerCase()
            if (q && !fullName.includes(q) && !guardianName.includes(q)) return false
            if (filterLocation && c.location !== filterLocation) return false
            if (filterClassroom && c.classroom !== filterClassroom) return false
            if (filterAllergies && !c.allergies) return false
            return true
        })
        .sort((a, b) => {
            let cmp = 0
            if (cSortCol === 'name') cmp = `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`)
            else if (cSortCol === 'location') cmp = (a.location || '').localeCompare(b.location || '')
            else if (cSortCol === 'classroom') cmp = (a.classroom || '').localeCompare(b.classroom || '')
            else if (cSortCol === 'guardian') {
                const gA = a.guardian ? `${a.guardian.lastName}${a.guardian.firstName}` : ''
                const gB = b.guardian ? `${b.guardian.lastName}${b.guardian.firstName}` : ''
                cmp = gA.localeCompare(gB)
            }
            else if (cSortCol === 'allergies') cmp = (a.allergies || '').localeCompare(b.allergies || '')
            return cSortAsc ? cmp : -cmp
        })

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

    const resetFilters = () => { setSearch(''); setFilterLocation(''); setFilterClassroom(''); setFilterAllergies(false); setPage(1) }
    const hasFilters = search || filterLocation || filterClassroom || filterAllergies

    // ── Filtered + sorted guardians ──
    const filteredGuardians = guardians
        .filter(g => {
            const name = `${g.firstName} ${g.lastName}`.toLowerCase()
            const g2name = `${g.guardian2FirstName || ''} ${g.guardian2LastName || ''}`.toLowerCase()
            const q = gSearch.toLowerCase()
            if (q && !name.includes(q) && !g2name.includes(q) &&
                !(g.email || '').toLowerCase().includes(q) &&
                !(g.phone || '').includes(q)) return false
            if (gFilterLinked === 'linked' && g._count.children === 0) return false
            if (gFilterLinked === 'unlinked' && g._count.children > 0) return false
            return true
        })
        .sort((a, b) => {
            let cmp = 0
            if (gSortCol === 'name') cmp = `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`)
            else if (gSortCol === 'pin') cmp = a.pin.localeCompare(b.pin)
            else if (gSortCol === 'phone') cmp = (a.phone || '').localeCompare(b.phone || '')
            else if (gSortCol === 'email') cmp = (a.email || '').localeCompare(b.email || '')
            else if (gSortCol === 'guardian2') cmp = `${a.guardian2LastName || ''}${a.guardian2FirstName || ''}`.localeCompare(`${b.guardian2LastName || ''}${b.guardian2FirstName || ''}`)
            else if (gSortCol === 'children') cmp = a._count.children - b._count.children
            return gSortAsc ? cmp : -cmp
        })

    const gTotalPages = Math.max(1, Math.ceil(filteredGuardians.length / G_PAGE_SIZE))
    const paginatedGuardians = filteredGuardians.slice((gPage - 1) * G_PAGE_SIZE, gPage * G_PAGE_SIZE)

    const resetGFilters = () => { setGSearch(''); setGFilterLinked(''); setGPage(1) }
    const hasGFilters = gSearch || gFilterLinked

    // ── Child ──
    const saveChild = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true); setError('')
        const fd = new FormData()
        if (editChild) fd.append('id', editChild.id)
        Object.entries(childForm).forEach(([k, v]) => fd.append(k, v))
        const res = editChild ? await updateChild(fd) : await createChild(fd)
        setSaving(false)
        if (res.error) setError(res.error)
        else { setChildModal(false); setEditChild(null); setChildForm(BLANK_C) }
    }
    const archiveChild = async (child: Child) => {
        if (!confirm(`Archive ${child.firstName} ${child.lastName}?`)) return
        const fd = new FormData(); fd.append('id', child.id)
        await deleteChild(fd)
    }

    const openEditChild = (c: Child) => {
        setEditChild(c)
        setChildForm({
            firstName: c.firstName, lastName: c.lastName, gender: c.gender || '',
            classroom: c.classroom || '', location: c.location || '',
            guardianId: c.guardian?.id || '', daysOfWeek: c.daysOfWeek || '',
            hours: c.hours || '', allergies: c.allergies || '', notes: c.notes || ''
        })
        setError(''); setChildModal(true)
    }
    const openNewChild = () => { setEditChild(null); setChildForm(BLANK_C); setError(''); setChildModal(true) }

    const unarchiveEntity = async (type: 'child' | 'guardian', id: string) => {
        if (!confirm(`Restore this ${type}?`)) return
        const fd = new FormData(); fd.append('id', id); fd.append('isActive', 'true')
        if (type === 'child') {
            await updateChild(fd)
        } else if (type === 'guardian') {
            await updateGuardian(fd)
        }
        router.refresh() // Refresh data after unarchive
    }

    // ── Guardian ──
    const BLANK_G = { firstName: '', lastName: '', pin: '', email: '', phone: '', secondaryPhone: '', address: '', city: '', state: '', zip: '', relationshipToChild: '', guardian2FirstName: '', guardian2LastName: '', guardian2Email: '', guardian2Phone: '', guardian2Relationship: '', notes: '' }

    const saveGuardian = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true); setError('')
        const fd = new FormData()
        if (editGuardian) fd.append('id', editGuardian.id)
        Object.entries(guardianForm).forEach(([k, v]) => fd.append(k, v))
        const res = editGuardian ? await updateGuardian(fd) : await createGuardian(fd)
        setSaving(false)
        if (res?.error) setError(res.error)
        else { setGuardianModal(false); setEditGuardian(null); setGuardianForm(BLANK_G) }
    }

    const openEditGuardian = (g: Guardian) => {
        setEditGuardian(g)
        setGuardianForm({
            firstName: g.firstName, lastName: g.lastName, pin: g.pin,
            email: g.email || '', phone: g.phone || '', secondaryPhone: '',
            address: '', city: '', state: '', zip: '',
            relationshipToChild: '',
            guardian2FirstName: g.guardian2FirstName || '',
            guardian2LastName: g.guardian2LastName || '',
            guardian2Email: '', guardian2Phone: g.guardian2Phone || '',
            guardian2Relationship: '', notes: ''
        })
        setError(''); setGuardianModal(true)
    }
    const openNewGuardian = () => { setEditGuardian(null); setGuardianForm(BLANK_G); setError(''); setGuardianModal(true) }

    // ── CSV ──
    const handleExport = async () => {
        const csv = await exportChildrenCsv()
        const blob = new Blob([csv], { type: 'text/csv' })
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
        a.download = `children-roster-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
    }
    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return
        const res = await importChildrenCsv(await file.text())
        setImportMsg(`Import: ${res.created} added, ${res.errors} skipped.`)
        e.target.value = ''
    }

    const tabBtn = (name: typeof tab, label: string) => (
        <button onClick={() => setTab(name)} style={{
            padding: '10px 22px', borderRadius: '8px 8px 0 0', border: 'none', cursor: 'pointer', fontWeight: 'bold',
            background: tab === name ? 'white' : '#e8eef4', color: tab === name ? 'var(--color-secondary)' : '#666'
        }}>{label}</button>
    )

    const inp = (label: string, key: string, obj: Record<string,string>, set: any, opts?: { type?: string; placeholder?: string }) => (
        <div><label style={{ fontSize: '0.82rem', fontWeight: 'bold', display: 'block', marginBottom: '3px' }}>{label}</label>
        <input className="input" type={opts?.type || 'text'} value={obj[key]} placeholder={opts?.placeholder}
            onChange={e => set((f: any) => ({ ...f, [key]: e.target.value }))} /></div>
    )

    const thSortObj = { cursor: 'pointer', userSelect: 'none' as const }
    const cth = (col: typeof cSortCol, label: string) => (
        <th style={{ padding: '10px', textAlign: 'left', ...thSortObj }} onClick={() => {
            if (cSortCol === col) setCSortAsc(!cSortAsc)
            else { setCSortCol(col); setCSortAsc(true) }
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {label} {cSortCol === col ? (cSortAsc ? '↑' : '↓') : <span style={{opacity: 0.3}}>↕</span>}
            </div>
        </th>
    )
    const gth = (col: typeof gSortCol, label: string) => (
        <th style={{ padding: '10px', textAlign: 'left', ...thSortObj }} onClick={() => {
            if (gSortCol === col) setGSortAsc(!gSortAsc)
            else { setGSortCol(col); setGSortAsc(true) }
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {label} {gSortCol === col ? (gSortAsc ? '↑' : '↓') : <span style={{opacity: 0.3}}>↕</span>}
            </div>
        </th>
    )

    return (
        <>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '-1px' }}>
                {tabBtn('roster', `Roster (${children.length})`)}
                {tabBtn('guardians', `Guardians (${guardians.length})`)}
                {tabBtn('today', `Today (${todayAttendance.length})`)}
            </div>

            <div className="card" style={{ borderRadius: '0 12px 12px 12px' }}>

                {/* ── ROSTER ── */}
                {tab === 'roster' && (<>
                    {/* ── Toolbar ── */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <button className="btn btn-secondary" onClick={handleExport} style={{ fontSize: '0.85rem', padding: '7px 14px' }}>⬇ CSV</button>
                            <label className="btn" style={{ fontSize: '0.85rem', padding: '7px 14px', background: '#eef2ff', color: '#457B9D', cursor: 'pointer' }}>
                                ⬆ Import<input type="file" accept=".csv" onChange={handleImport} style={{ display: 'none' }} />
                            </label>
                            {importMsg && <span style={{ fontSize: '0.82rem', color: 'green' }}>{importMsg}</span>}
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button className="btn" onClick={() => router.push(showArchived ? '/admin/children' : '/admin/children?archived=true')} style={{ background: showArchived ? '#e63946' : '#fff0f0', color: showArchived ? 'white' : '#e63946' }}>
                                {showArchived ? 'View Active' : 'View Archived'}
                            </button>
                            <button className="btn btn-primary" onClick={openNewChild}>+ Add Child</button>
                        </div>
                    </div>

                    {/* ── Search + Filters ── */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <input
                            className="input"
                            placeholder="🔍 Search name or guardian…"
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1) }}
                            style={{ flex: '1 1 220px', minWidth: '180px' }}
                        />
                        <select className="input" value={filterLocation} onChange={e => { setFilterLocation(e.target.value); setPage(1) }} style={{ flex: '0 0 auto' }}>
                            <option value="">All Locations</option>
                            {locations.map(l => <option key={l}>{l}</option>)}
                        </select>
                        <select className="input" value={filterClassroom} onChange={e => { setFilterClassroom(e.target.value); setPage(1) }} style={{ flex: '0 0 auto' }}>
                            <option value="">All Classrooms</option>
                            {classrooms.map(c => <option key={c}>{c}</option>)}
                        </select>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '0.88rem', whiteSpace: 'nowrap' }}>

                            <input type="checkbox" checked={filterAllergies} onChange={e => { setFilterAllergies(e.target.checked); setPage(1) }} />
                            ⚠ Allergies only
                        </label>
                        {hasFilters && <button onClick={resetFilters} style={{ background: 'none', border: '1px solid #ccc', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontSize: '0.82rem', color: '#888' }}>✕ Clear</button>}
                    </div>

                    {/* ── Result count ── */}
                    <div style={{ fontSize: '0.82rem', color: '#888', marginBottom: '10px' }}>
                        Showing {paginated.length} of {filtered.length} children
                        {hasFilters && ` (filtered from ${children.length} total)`}
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead><tr style={{ borderBottom: '2px solid #eee', color: '#666', fontSize: '0.8rem' }}>
                            {cth('name', 'Name')}
                            {cth('location', 'Location')}
                            {cth('classroom', 'Classroom')}
                            {cth('guardian', 'Guardian (PIN)')}
                            {cth('allergies', 'Allergies')}
                            <th style={{ padding: '10px' }}></th>
                        </tr></thead>
                        <tbody>
                            {paginated.length === 0 && <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#aaa' }}>{hasFilters ? 'No children match your filters.' : 'No children yet.'}</td></tr>}
                            {paginated.map(c => (
                                <tr key={c.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                    <td style={{ padding: '12px' }}><Link href={`/admin/children/${c.id}`} style={{ fontWeight: 'bold', color: 'var(--color-secondary)', textDecoration: 'underline' }}>{c.firstName} {c.lastName}</Link></td>
                                    <td style={{ padding: '12px', color: '#888', fontSize: '0.85rem' }}>{c.location || '—'}</td>
                                    <td style={{ padding: '12px', color: '#555', fontSize: '0.85rem' }}>{c.classroom || '—'}</td>
                                    <td style={{ padding: '12px', color: '#555' }}>
                                        {c.guardian
                                            ? <><Link href={`/admin/guardians/${c.guardian.id}`} style={{ fontWeight: 'bold', color: 'var(--color-secondary)', textDecoration: 'underline' }}>{c.guardian.firstName} {c.guardian.lastName}</Link> <span style={{ background: '#f0f4ff', padding: '2px 8px', borderRadius: '999px', fontSize: '0.8rem', fontFamily: 'monospace', color: '#457B9D' }}>{c.guardian.pin}</span></>
                                            : <span style={{ color: '#aaa' }}>No guardian linked</span>}
                                    </td>
                                    <td style={{ padding: '12px', color: c.allergies ? '#e63946' : '#aaa', fontSize: '0.85rem' }}>{c.allergies ? `⚠ ${c.allergies}` : 'None'}</td>
                                    <td style={{ padding: '12px', display: 'flex', gap: '6px' }}>
                                        <button className="btn" style={{ fontSize: '0.8rem', padding: '6px 10px', background: '#eef2ff', color: '#457B9D' }} onClick={() => openEditChild(c)}>Edit</button>
                                        {showArchived ? (
                                            <button className="btn" style={{ fontSize: '0.8rem', padding: '6px 10px', background: '#e8f5e9', color: 'green' }} onClick={() => unarchiveEntity('child', c.id)}>Unarchive</button>
                                        ) : (
                                            <button className="btn" style={{ fontSize: '0.8rem', padding: '6px 10px', background: '#fff0f0', color: '#e63946' }} onClick={() => archiveChild(c)}>Archive</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* ── Pagination ── */}
                    {totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '20px', flexWrap: 'wrap' }}>
                            <button onClick={() => setPage(1)} disabled={page === 1} className="btn" style={{ padding: '6px 10px', background: '#f0f0f0', color: '#333' }}>«</button>
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn" style={{ padding: '6px 12px', background: '#f0f0f0', color: '#333' }}>‹ Prev</button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                                .reduce((acc: (number | '…')[], p, i, arr) => {
                                    if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('…')
                                    acc.push(p); return acc
                                }, [])
                                .map((p, i) => p === '…'
                                    ? <span key={`ellipsis-${i}`} style={{ padding: '0 4px', color: '#aaa' }}>…</span>
                                    : <button key={p} onClick={() => setPage(p as number)} className="btn" style={{ padding: '6px 12px', background: page === p ? 'var(--color-secondary)' : '#f0f0f0', color: page === p ? 'white' : '#333', fontWeight: page === p ? 'bold' : 'normal' }}>{p}</button>
                                )
                            }
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn" style={{ padding: '6px 12px', background: '#f0f0f0', color: '#333' }}>Next ›</button>
                            <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="btn" style={{ padding: '6px 10px', background: '#f0f0f0', color: '#333' }}>»</button>
                            <span style={{ fontSize: '0.82rem', color: '#888' }}>Page {page} of {totalPages}</span>
                        </div>
                    )}
                </>)}


                {/* ── GUARDIANS ── */}
                {tab === 'guardians' && (<>
                    {/* ── Toolbar ── */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                        <p style={{ margin: 0, color: '#888', fontSize: '0.88rem' }}>Guardians PIN in at the kiosk to check in/out all their children at once.</p>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button className="btn" onClick={() => router.push(showArchived ? '/admin/children' : '/admin/children?archived=true')} style={{ background: showArchived ? '#e63946' : '#fff0f0', color: showArchived ? 'white' : '#e63946' }}>
                                {showArchived ? 'View Active' : 'View Archived'}
                            </button>
                            <button className="btn btn-primary" onClick={openNewGuardian}>+ Add Guardian</button>
                        </div>
                    </div>

                    {/* ── Search + Filters ── */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <input
                            className="input"
                            placeholder="🔍 Search name, email, or phone…"
                            value={gSearch}
                            onChange={e => { setGSearch(e.target.value); setGPage(1) }}
                            style={{ flex: '1 1 220px', minWidth: '180px' }}
                        />
                        <select className="input" value={gFilterLinked} onChange={e => { setGFilterLinked(e.target.value as typeof gFilterLinked); setGPage(1) }} style={{ flex: '0 0 auto' }}>
                            <option value="">All Guardians</option>
                            <option value="linked">Has Children Linked</option>
                            <option value="unlinked">No Children Linked</option>
                        </select>
                        {hasGFilters && <button onClick={resetGFilters} style={{ background: 'none', border: '1px solid #ccc', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontSize: '0.82rem', color: '#888' }}>✕ Clear</button>}
                    </div>

                    {/* ── Result count ── */}
                    <div style={{ fontSize: '0.82rem', color: '#888', marginBottom: '10px' }}>
                        Showing {paginatedGuardians.length} of {filteredGuardians.length} guardians
                        {hasGFilters && ` (filtered from ${guardians.length} total)`}
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead><tr style={{ borderBottom: '2px solid #eee', color: '#666', fontSize: '0.8rem' }}>
                            {gth('name', 'Name')}
                            {gth('pin', 'PIN')}
                            {gth('phone', 'Phone')}
                            {gth('email', 'Email')}
                            {gth('guardian2', 'Guardian 2')}
                            {gth('children', 'Children')}
                            <th style={{ padding: '10px' }}></th>
                        </tr></thead>
                        <tbody>
                            {paginatedGuardians.length === 0 && <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#aaa' }}>{hasGFilters ? 'No guardians match your search.' : 'No guardians yet.'}</td></tr>}
                            {paginatedGuardians.map(g => (
                                <tr key={g.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                    <td style={{ padding: '12px' }}>
                                        <Link href={`/admin/guardians/${g.id}`} style={{ fontWeight: 'bold', color: 'var(--color-secondary)', textDecoration: 'underline' }}>
                                            {g.firstName} {g.lastName}
                                        </Link>
                                    </td>
                                    <td style={{ padding: '12px' }}><span style={{ background: '#f0f4ff', padding: '4px 10px', borderRadius: '6px', fontFamily: 'monospace', fontWeight: 'bold', color: '#457B9D' }}>{g.pin}</span></td>
                                    <td style={{ padding: '12px', color: '#555', fontSize: '0.88rem' }}>{g.phone || '—'}</td>
                                    <td style={{ padding: '12px', color: '#555', fontSize: '0.88rem' }}>{g.email || '—'}</td>
                                    <td style={{ padding: '12px', color: '#888', fontSize: '0.85rem' }}>
                                        {g.guardian2FirstName ? `${g.guardian2FirstName} ${g.guardian2LastName || ''}` : '—'}
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <Link href={`/admin/guardians/${g.id}`} style={{
                                            background: g._count.children > 0 ? '#e8f5e9' : '#f5f5f5',
                                            color: g._count.children > 0 ? 'green' : '#aaa',
                                            padding: '3px 10px', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 'bold',
                                            textDecoration: 'none', display: 'inline-block'
                                        }}>{g._count.children}</Link>
                                    </td>
                                    <td style={{ padding: '12px', display: 'flex', gap: '6px' }}>
                                        <button className="btn" style={{ fontSize: '0.8rem', padding: '6px 10px', background: '#eef2ff', color: '#457B9D' }} onClick={() => openEditGuardian(g)}>Edit</button>
                                        {showArchived ? (
                                            <button className="btn" style={{ fontSize: '0.8rem', padding: '6px 10px', background: '#e8f5e9', color: 'green' }} onClick={() => unarchiveEntity('guardian', g.id)}>Unarchive</button>
                                        ) : (
                                            <button className="btn" style={{ fontSize: '0.8rem', padding: '6px 10px', background: '#fff0f0', color: '#e63946' }} onClick={() => {
                                                if (confirm(`Archive ${g.firstName} ${g.lastName}?`)) deleteGuardian(g.id)
                                            }}>Archive</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* ── Guardian Pagination ── */}
                    {gTotalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '20px', flexWrap: 'wrap' }}>
                            <button onClick={() => setGPage(1)} disabled={gPage === 1} className="btn" style={{ padding: '6px 10px', background: '#f0f0f0', color: '#333' }}>«</button>
                            <button onClick={() => setGPage(p => Math.max(1, p - 1))} disabled={gPage === 1} className="btn" style={{ padding: '6px 12px', background: '#f0f0f0', color: '#333' }}>‹ Prev</button>
                            {Array.from({ length: gTotalPages }, (_, i) => i + 1)
                                .filter(p => p === 1 || p === gTotalPages || Math.abs(p - gPage) <= 2)
                                .reduce((acc: (number | '…')[], p, i, arr) => {
                                    if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('…')
                                    acc.push(p); return acc
                                }, [])
                                .map((p, i) => p === '…'
                                    ? <span key={`g-ellipsis-${i}`} style={{ padding: '0 4px', color: '#aaa' }}>…</span>
                                    : <button key={p} onClick={() => setGPage(p as number)} className="btn" style={{ padding: '6px 12px', background: gPage === p ? 'var(--color-secondary)' : '#f0f0f0', color: gPage === p ? 'white' : '#333', fontWeight: gPage === p ? 'bold' : 'normal' }}>{p}</button>
                                )
                            }
                            <button onClick={() => setGPage(p => Math.min(gTotalPages, p + 1))} disabled={gPage === gTotalPages} className="btn" style={{ padding: '6px 12px', background: '#f0f0f0', color: '#333' }}>Next ›</button>
                            <button onClick={() => setGPage(gTotalPages)} disabled={gPage === gTotalPages} className="btn" style={{ padding: '6px 10px', background: '#f0f0f0', color: '#333' }}>»</button>
                            <span style={{ fontSize: '0.82rem', color: '#888' }}>Page {gPage} of {gTotalPages}</span>
                        </div>
                    )}
                </>)}


                {/* ── TODAY ── */}
                {tab === 'today' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                        <div>
                            <h3 style={{ color: 'var(--color-success)', margin: '0 0 12px' }}>Currently Here ({todayPresent.length})</h3>
                            {todayPresent.length === 0 && <p style={{ color: '#888' }}>None checked in.</p>}
                            {todayPresent.map(a => (
                                <div key={a.id} style={{ padding: '12px', borderBottom: '1px solid #f0f0f0' }}>
                                    <div style={{ fontWeight: 'bold' }}>{a.child.firstName} {a.child.lastName}</div>
                                    <div style={{ fontSize: '0.85rem', color: '#666' }}>
                                        In: {new Date(a.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        {a.checkedInBy && ` · by ${a.checkedInBy}`}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div>
                            <h3 style={{ color: '#888', margin: '0 0 12px' }}>Checked Out ({todayGone.length})</h3>
                            {todayGone.length === 0 && <p style={{ color: '#888' }}>None yet.</p>}
                            {todayGone.map(a => (
                                <div key={a.id} style={{ padding: '12px', borderBottom: '1px solid #f0f0f0' }}>
                                    <div style={{ fontWeight: 'bold' }}>{a.child.firstName} {a.child.lastName}</div>
                                    <div style={{ fontSize: '0.85rem', color: '#666' }}>
                                        {new Date(a.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} → {a.checkOut ? new Date(a.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                        {a.checkedOutBy && ` · by ${a.checkedOutBy}`}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ── ADD CHILD MODAL ── */}
            {childModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
                    <div className="card" style={{ width: '520px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h2 style={{ margin: '0 0 20px' }}>Add Child</h2>
                        <form onSubmit={saveChild} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                {inp('First Name *', 'firstName', childForm, setChildForm)}
                                {inp('Last Name *', 'lastName', childForm, setChildForm)}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div><label style={{ fontSize: '0.82rem', fontWeight: 'bold', display: 'block', marginBottom: '3px' }}>Gender</label>
                                    <select className="input" value={childForm.gender} onChange={e => setChildForm(f => ({ ...f, gender: e.target.value }))}>
                                        <option value="">--</option><option>Male</option><option>Female</option>
                                    </select>
                                </div>
                                <div><label style={{ fontSize: '0.82rem', fontWeight: 'bold', display: 'block', marginBottom: '3px' }}>Location</label>
                                    <select className="input" value={childForm.location} onChange={e => setChildForm(f => ({ ...f, location: e.target.value }))}>
                                        <option value="">--</option>{locations.map(l => <option key={l}>{l}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div><label style={{ fontSize: '0.82rem', fontWeight: 'bold', display: 'block', marginBottom: '3px' }}>Classroom</label>
                                <select className="input" value={childForm.classroom} onChange={e => setChildForm(f => ({ ...f, classroom: e.target.value }))}>
                                    <option value="">--</option>{classrooms.map(c => <option key={c}>{c}</option>)}
                                </select>
                            </div>
                            <div><label style={{ fontSize: '0.82rem', fontWeight: 'bold', display: 'block', marginBottom: '3px' }}>Guardian (PIN holder)</label>
                                <select className="input" value={childForm.guardianId} onChange={e => setChildForm(f => ({ ...f, guardianId: e.target.value }))}>
                                    <option value="">-- No guardian linked yet --</option>
                                    {guardians.map(g => <option key={g.id} value={g.id}>{g.firstName} {g.lastName} (PIN: {g.pin})</option>)}
                                </select>
                            </div>
                            {inp('Allergies', 'allergies', childForm, setChildForm, { placeholder: 'Peanuts, eggs, latex…' })}
                            {inp('Admin Notes', 'notes', childForm, setChildForm)}
                            {error && <p style={{ color: 'red', margin: 0 }}>{error}</p>}
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={() => setChildModal(false)} className="btn" style={{ background: '#eee', color: '#333' }}>Cancel</button>
                                <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'Saving…' : 'Add Child'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── GUARDIAN MODAL ── */}
            {guardianModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
                    <div className="card" style={{ width: '580px', maxWidth: '95vw', maxHeight: '92vh', overflowY: 'auto' }}>
                        <h2 style={{ margin: '0 0 20px' }}>{editGuardian ? 'Edit Guardian' : 'Add Guardian'}</h2>
                        <form onSubmit={saveGuardian} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <h3 style={{ margin: '0 0 -4px', color: '#457B9D', fontSize: '0.95rem' }}>Parent / Guardian 1</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                {inp('First Name *', 'firstName', guardianForm, setGuardianForm)}
                                {inp('Last Name *', 'lastName', guardianForm, setGuardianForm)}
                            </div>
                            <div>
                                <label style={{ fontSize: '0.82rem', fontWeight: 'bold', display: 'block', marginBottom: '3px' }}>4-Digit Kiosk PIN *</label>
                                <input className="input" value={guardianForm.pin}
                                    onChange={e => setGuardianForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                                    maxLength={4} placeholder="e.g. 7842" required />
                                <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#888' }}>Guardian enters this PIN at the kiosk to see their children.</p>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                {inp('Relationship', 'relationshipToChild', guardianForm, setGuardianForm, { placeholder: 'Mother, Father, Guardian…' })}
                                {inp('Primary Phone', 'phone', guardianForm, setGuardianForm, { type: 'tel' })}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                {inp('Secondary Phone', 'secondaryPhone', guardianForm, setGuardianForm, { type: 'tel' })}
                                {inp('Email', 'email', guardianForm, setGuardianForm, { type: 'email' })}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px' }}>
                                {inp('Street Address', 'address', guardianForm, setGuardianForm)}
                                {inp('City', 'city', guardianForm, setGuardianForm)}
                                {inp('State', 'state', guardianForm, setGuardianForm)}
                            </div>

                            <h3 style={{ margin: '8px 0 -4px', color: '#457B9D', fontSize: '0.95rem', borderTop: '1px solid #eee', paddingTop: '12px' }}>Parent / Guardian 2 (optional)</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                {inp('First Name', 'guardian2FirstName', guardianForm, setGuardianForm)}
                                {inp('Last Name', 'guardian2LastName', guardianForm, setGuardianForm)}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                {inp('Relationship', 'guardian2Relationship', guardianForm, setGuardianForm, { placeholder: 'Father, Mother…' })}
                                {inp('Phone', 'guardian2Phone', guardianForm, setGuardianForm, { type: 'tel' })}
                            </div>
                            {inp('Email', 'guardian2Email', guardianForm, setGuardianForm, { type: 'email' })}
                            {inp('Notes', 'notes', guardianForm, setGuardianForm)}

                            {error && <p style={{ color: 'red', margin: 0 }}>{error}</p>}
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={() => { setGuardianModal(false); setEditGuardian(null) }} className="btn" style={{ background: '#eee', color: '#333' }}>Cancel</button>
                                <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'Saving…' : (editGuardian ? 'Save Changes' : 'Add Guardian')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
