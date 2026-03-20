'use client'

import { useState } from 'react'
import { updateEmployee } from '@/app/actions/admin-users'

type Location = {
    id: string
    name: string
}

type Employee = {
    id: string
    name: string
    pin: string
    baseRate: number
    hireDate: Date | null
    phone: string | null
    address: string | null
    emergencyContact: string | null
    notes: string | null
    adminRole: string
    locationId: string | null
    payType: string
    yearlySalary: number | null
}

export default function EditEmployeeForm({ employee, locations }: { employee: Employee; locations: Location[] }) {
    const [payType, setPayType] = useState(employee.payType || 'HOURLY')

    return (
        <form action={async (fd: FormData) => { await updateEmployee(fd) }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input type="hidden" name="id" value={employee.id} />
            
            <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Full Name</label>
                <input name="name" defaultValue={employee.name} className="input" required />
            </div>
            <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>PIN</label>
                <input name="pin" defaultValue={employee.pin} className="input" maxLength={4} required />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Pay Type</label>
                    <select name="payType" className="input" value={payType} onChange={e => setPayType(e.target.value)}>
                        <option value="HOURLY">Hourly</option>
                        <option value="SALARY">Flat Yearly Salary</option>
                    </select>
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Hire Date</label>
                    <input name="hireDate" type="date" defaultValue={employee.hireDate ? new Date(employee.hireDate).toISOString().split('T')[0] : ''} className="input" />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {payType === 'HOURLY' ? (
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Base Hourly Rate ($)</label>
                        <input name="baseRate" type="number" step="0.01" defaultValue={employee.baseRate} className="input" required />
                    </div>
                ) : (
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Yearly Salary ($)</label>
                        <input name="yearlySalary" type="number" step="1" defaultValue={employee.yearlySalary || ''} className="input" required />
                    </div>
                )}
                <div></div>
            </div>

            <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Phone</label>
                <input name="phone" type="tel" defaultValue={employee.phone || ''} className="input" placeholder="(555) 555-5555" />
            </div>
            <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Address</label>
                <input name="address" defaultValue={employee.address || ''} className="input" placeholder="123 Main St, City, State" />
            </div>
            <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Emergency Contact</label>
                <input name="emergencyContact" defaultValue={employee.emergencyContact || ''} className="input" placeholder="Name - Phone" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Admin Role</label>
                    <select name="adminRole" defaultValue={employee.adminRole} className="input">
                        <option value="NONE">None</option>
                        <option value="SUPERADMIN">Superadmin</option>
                        <option value="MANAGER">Manager</option>
                        <option value="FRONT_DESK">Front Desk</option>
                    </select>
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Campus Location</label>
                    <select name="locationId" defaultValue={employee.locationId || ''} className="input">
                        <option value="">All Locations / None</option>
                        {locations.map(loc => (
                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Notes</label>
                <textarea name="notes" defaultValue={employee.notes || ''} className="input" rows={2} style={{ resize: 'vertical' }} />
            </div>

            <button type="submit" className="btn btn-primary">Save Changes</button>
        </form>
    )
}
