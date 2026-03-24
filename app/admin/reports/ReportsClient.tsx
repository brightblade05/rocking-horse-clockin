'use client'

import { useState, useMemo } from 'react'
import { getPayrollReport, PayrollEntry } from '@/app/actions/reports'
import Link from 'next/link'

type Frequency = 'WEEKLY' | 'BI_WEEKLY' | 'SEMI_MONTHLY'

export default function ReportsClient() {
    const [frequency, setFrequency] = useState<Frequency>('WEEKLY')
    const [anchorDate, setAnchorDate] = useState(new Date().toISOString().split('T')[0])
    const [selectedPeriodStart, setSelectedPeriodStart] = useState<Date>(new Date())
    const [reportData, setReportData] = useState<PayrollEntry[] | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    const periods = useMemo(() => {
        if (!anchorDate) return []
        const [y, m, d] = anchorDate.split('-').map(Number)
        const start = new Date(y, m - 1, d)
        const periodList = []

        for (let i = -5; i < 10; i++) {
            let pStart: Date, pEnd: Date

            if (frequency === 'WEEKLY') {
                pStart = new Date(start)
                pStart.setDate(start.getDate() + (i * 7))
                pEnd = new Date(pStart)
                pEnd.setDate(pStart.getDate() + 6)
            } else if (frequency === 'BI_WEEKLY') {
                pStart = new Date(start)
                pStart.setDate(start.getDate() + (i * 14))
                pEnd = new Date(pStart)
                pEnd.setDate(pStart.getDate() + 13)
            } else {
                const monthShift = Math.floor(i / 2)
                const isSecondHalf = i % 2 !== 0
                const baseDate = new Date(start)
                baseDate.setMonth(start.getMonth() + monthShift)

                if (!isSecondHalf) {
                    pStart = new Date(baseDate)
                    pStart.setDate(d)
                    pEnd = new Date(pStart)
                    pEnd.setDate(pStart.getDate() + 14)
                } else {
                    const p1Start = new Date(baseDate)
                    p1Start.setDate(d)
                    pStart = new Date(p1Start)
                    pStart.setDate(p1Start.getDate() + 15)
                    const nextMonth = new Date(baseDate)
                    nextMonth.setMonth(baseDate.getMonth() + 1)
                    nextMonth.setDate(d)
                    pEnd = new Date(nextMonth)
                    pEnd.setDate(nextMonth.getDate() - 1)
                }
            }

            pStart.setHours(0, 0, 0, 0)
            pEnd.setHours(23, 59, 59, 999)
            periodList.push({ start: pStart, end: pEnd })
        }
        return periodList
    }, [frequency, anchorDate])

    const activePeriod = useMemo(() => {
        const match = periods.find(p => p.start.getTime() === selectedPeriodStart.getTime())
        if (match) return match
        const now = new Date()
        const current = periods.find(p => p.start <= now && p.end >= now)
        return current || periods[0]
    }, [periods, selectedPeriodStart])

    const handleGenerate = async () => {
        if (!activePeriod) return
        setIsLoading(true)
        try {
            const result = await getPayrollReport(activePeriod.start, activePeriod.end)
            setReportData(result)
        } catch (err) {
            console.error(err)
            alert("Failed to generate report")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <header style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between' }}>
                <h1 style={{ color: 'var(--color-primary)' }}>Payroll Reports</h1>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <Link href="/admin/reports/children" className="btn btn-primary" style={{ background: '#457B9D', border: 'none' }}>Child Reports</Link>
                    <Link href="/admin" className="btn btn-secondary">Back to Dashboard</Link>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px' }}>
                <div className="card">
                    <h2 style={{ fontSize: '1.2rem', marginTop: 0 }}>Configuration</h2>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Frequency</label>
                        <select className="input" value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)}>
                            <option value="WEEKLY">Weekly (7 Days)</option>
                            <option value="BI_WEEKLY">Bi-Weekly (14 Days)</option>
                            <option value="SEMI_MONTHLY">Semi-Monthly (2/Month)</option>
                        </select>
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
                            {frequency === 'SEMI_MONTHLY' ? 'Start Day of First Period' : 'Start Day of Week'}
                        </label>
                        <input type="date" className="input" value={anchorDate} onChange={(e) => setAnchorDate(e.target.value)} />
                        <p style={{ fontSize: '0.8em', color: '#666', marginTop: '5px' }}>Adjusting this shifts the entire schedule.</p>
                    </div>
                    <hr style={{ margin: '20px 0', border: 0, borderTop: '1px solid #eee' }} />
                    <h3 style={{ fontSize: '1rem' }}>Select Period</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
                        {periods.map((p, idx) => {
                            const isActive = activePeriod && p.start.getTime() === activePeriod.start.getTime()
                            const isPast = p.end < new Date()
                            return (
                                <button key={idx} onClick={() => setSelectedPeriodStart(p.start)} style={{
                                    padding: '10px', borderRadius: '8px',
                                    border: isActive ? '2px solid var(--color-primary)' : '1px solid #ddd',
                                    backgroundColor: isActive ? '#fff0f0' : 'white',
                                    textAlign: 'left', cursor: 'pointer', opacity: isPast ? 0.8 : 1
                                }}>
                                    <div style={{ fontWeight: 'bold' }}>{p.start.toLocaleDateString()} - {p.end.toLocaleDateString()}</div>
                                    <div style={{ fontSize: '0.8em', color: '#666' }}>{Math.round((p.end.getTime() - p.start.getTime()) / (1000 * 60 * 60 * 24))} Days</div>
                                </button>
                            )
                        })}
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
                        {activePeriod ? (
                            <>
                                <h2 style={{ fontSize: '1.5rem', color: 'var(--color-primary)' }}>
                                    {activePeriod.start.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    <br /><span style={{ fontSize: '0.8em', color: '#666' }}>to</span><br />
                                    {activePeriod.end.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </h2>
                                <button className="btn btn-primary" style={{ fontSize: '1.2rem', padding: '15px 40px', marginTop: '20px' }} onClick={handleGenerate} disabled={isLoading}>
                                    {isLoading ? 'Generating...' : 'Generate Report'}
                                </button>
                            </>
                        ) : (
                            <p>Select a period from the left sidebar.</p>
                        )}
                    </div>

                    {reportData && (
                        <div className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h2>Report Results</h2>
                                <button className="btn btn-secondary" onClick={() => window.print()}>Print / Save PDF</button>
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid #ddd', backgroundColor: '#f9f9f9' }}>
                                        <th style={{ padding: '12px', textAlign: 'left' }}>Employee</th>
                                        <th style={{ padding: '12px', textAlign: 'right' }}>Total Hours</th>
                                        <th style={{ padding: '12px', textAlign: 'right' }}>Gross Pay</th>
                                        <th style={{ padding: '12px', textAlign: 'right' }}>Accrued PTO</th>
                                        <th style={{ padding: '12px', textAlign: 'left' }}>Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.map(entry => (
                                        <tr key={entry.userId} style={{ borderBottom: '1px solid #eee' }}>
                                            <td style={{ padding: '12px', fontWeight: 'bold' }}>
                                                {entry.name}
                                                <div style={{ fontSize: '0.8em', fontWeight: 'normal', color: '#666' }}>ID: {entry.userId.slice(0, 8)}</div>
                                            </td>
                                            <td style={{ padding: '12px', textAlign: 'right', fontSize: '1.1em' }}>{entry.totalHours.toFixed(2)}</td>
                                            <td style={{ padding: '12px', textAlign: 'right', fontSize: '1.1em', color: 'var(--color-success)', fontWeight: 'bold' }}>${entry.grossPay.toFixed(2)}</td>
                                            <td style={{ padding: '12px', textAlign: 'right', fontSize: '1.1em', color: '#888' }}>{entry.accruedPto > 0 ? `+${entry.accruedPto.toFixed(2)}h` : '-'}</td>
                                            <td style={{ padding: '12px' }}>
                                                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.9em', color: '#555' }}>
                                                    {entry.details.map((d, i) => (
                                                        <li key={i}>{d.roleName}: {d.hours.toFixed(2)}h @ ${d.rate.toFixed(2)} = ${d.pay.toFixed(2)}</li>
                                                    ))}
                                                </ul>
                                            </td>
                                        </tr>
                                    ))}
                                    {reportData.length === 0 && (
                                        <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#666' }}>No data found for this period.</td></tr>
                                    )}
                                </tbody>
                                <tfoot>
                                    <tr style={{ backgroundColor: '#f0f0f0', fontWeight: 'bold' }}>
                                        <td style={{ padding: '12px' }}>TOTALS</td>
                                        <td style={{ padding: '12px', textAlign: 'right' }}>{reportData.reduce((acc, curr) => acc + curr.totalHours, 0).toFixed(2)}</td>
                                        <td style={{ padding: '12px', textAlign: 'right' }}>${reportData.reduce((acc, curr) => acc + curr.grossPay, 0).toFixed(2)}</td>
                                        <td style={{ padding: '12px', textAlign: 'right' }}>{reportData.reduce((acc, curr) => acc + curr.accruedPto, 0).toFixed(2)}h</td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
