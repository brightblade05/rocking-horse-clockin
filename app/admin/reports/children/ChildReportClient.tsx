'use client'

import { useState } from 'react'
import { getChildAttendanceReport, ChildAttendanceReport } from '@/app/actions/reports-children'
import Link from 'next/link'

export default function ChildReportClient() {
    const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0])
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
    const [reportData, setReportData] = useState<ChildAttendanceReport | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    const handleGenerate = async () => {
        setIsLoading(true)
        try {
            const data = await getChildAttendanceReport(new Date(startDate), new Date(endDate))
            setReportData(data)
        } catch (err) {
            console.error(err)
            alert('Failed to generate report')
        } finally {
            setIsLoading(false)
        }
    }

    const formatHrs = (ms: number) => (ms / (1000 * 60 * 60)).toFixed(1)

    return (
        <div>
            <header style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ color: 'var(--color-primary)', margin: 0 }}>📊 Child Attendance Report</h1>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <Link href="/admin/reports" className="btn btn-secondary">Payroll Reports</Link>
                    <Link href="/admin" className="btn">← Dashboard</Link>
                </div>
            </header>

            <div className="card" style={{ marginBottom: '24px', display: 'flex', gap: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Start Date</label>
                    <input type="date" className="input" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>End Date</label>
                    <input type="date" className="input" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
                <button className="btn btn-primary" onClick={handleGenerate} disabled={isLoading}>
                    {isLoading ? 'Loading...' : 'Generate Report'}
                </button>
            </div>

            {reportData && (
                <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                        <div className="card" style={{ textAlign: 'center' }}>
                            <h3 style={{ margin: '0 0 10px', color: '#666' }}>Active Children</h3>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>{reportData.totalChildren}</div>
                        </div>
                        <div className="card" style={{ textAlign: 'center' }}>
                            <h3 style={{ margin: '0 0 10px', color: '#666' }}>Total Attendances</h3>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#457B9D' }}>{reportData.totalAttendances}</div>
                        </div>
                        <div className="card" style={{ textAlign: 'center' }}>
                            <h3 style={{ margin: '0 0 10px', color: '#666' }}>Avg Daily Time</h3>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-secondary)' }}>{formatHrs(reportData.averageTimeSpentMs)} <span style={{fontSize:'1rem'}}>hrs</span></div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '30px' }}>
                        <div className="card">
                            <h3 style={{ marginTop: 0 }}>Children by Location</h3>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <tbody>
                                    {Object.entries(reportData.childrenByLocation)
                                        .sort((a,b) => b[1] - a[1]) // highest first
                                        .map(([loc, count]) => (
                                        <tr key={loc} style={{ borderBottom: '1px solid #eee' }}>
                                            <td style={{ padding: '12px 0' }}>{loc}</td>
                                            <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 'bold' }}>{count}</td>
                                        </tr>
                                    ))}
                                    {Object.keys(reportData.childrenByLocation).length === 0 && (
                                        <tr><td colSpan={2} style={{ padding: '20px', textAlign: 'center', color: '#999' }}>No data</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="card">
                            <h3 style={{ marginTop: 0 }}>Attendance by Date</h3>
                            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <tbody>
                                        {reportData.attendanceByDay.map(({ date, count }) => (
                                            <tr key={date} style={{ borderBottom: '1px solid #eee' }}>
                                                <td style={{ padding: '8px 0' }}>{new Date(date + 'T00:00:00').toLocaleDateString()}</td>
                                                <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 'bold' }}>{count}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <h3 style={{ marginTop: 0 }}>Child Details</h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #ddd', textAlign: 'left' }}>
                                    <th style={{ padding: '10px' }}>Name</th>
                                    <th style={{ padding: '10px' }}>Location</th>
                                    <th style={{ padding: '10px' }}>Classroom</th>
                                    <th style={{ padding: '10px', textAlign: 'right' }}>Days Attended</th>
                                    <th style={{ padding: '10px', textAlign: 'right' }}>Total Hours</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.childrenList.filter(c => c.totalDays > 0).map(child => (
                                    <tr key={child.id} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={{ padding: '10px', fontWeight: 'bold' }}>{child.name}</td>
                                        <td style={{ padding: '10px' }}>{child.location}</td>
                                        <td style={{ padding: '10px' }}>{child.classroom}</td>
                                        <td style={{ padding: '10px', textAlign: 'right' }}>{child.totalDays}</td>
                                        <td style={{ padding: '10px', textAlign: 'right' }}>{child.totalHours.toFixed(1)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
