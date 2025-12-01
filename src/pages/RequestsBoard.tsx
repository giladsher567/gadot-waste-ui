import React, { useEffect, useState } from 'react';
import { api } from '../api';
import type { WasteRequest, RequestStatus } from '../types';
import { Drawer, Input, Select, Textarea, Checkbox } from '../components/ui';
import {
    Filter, Search, RefreshCw, FileText, Truck, MapPin, User, Phone, Mail
} from 'lucide-react';

export const RequestsBoardPage: React.FC = () => {

    const [requests, setRequests] = useState<WasteRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedRequest, setSelectedRequest] = useState<WasteRequest | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const [filterStatus, setFilterStatus] = useState<string>('');
    const [filterAgent, setFilterAgent] = useState<string>('');
    const [filterNew, setFilterNew] = useState<boolean>(false);

    useEffect(() => {
        loadRequests();
    }, []);

    const loadRequests = async () => {
        setLoading(true);
        try {
            const data = await api.listRequests();
            setRequests(data);
        } catch {
            setError('שגיאה בטעינת הנתונים');
        } finally {
            setLoading(false);
        }
    };

    const handleRowClick = (req: WasteRequest) => {
        setSelectedRequest(req);
        setIsDrawerOpen(true);
    };

    const handleUpdate = async (updates: Partial<WasteRequest>) => {
        if (!selectedRequest?.request_id) return;
        try {
            await api.updateRequest(selectedRequest.request_id, updates);

            setRequests(prev =>
                prev.map(r => r.request_id === selectedRequest.request_id ? { ...r, ...updates } : r)
            );

            setSelectedRequest(prev => prev ? { ...prev, ...updates } : null);
            alert('עודכן בהצלחה');
        } catch {
            alert('שגיאה בעדכון');
        }
    };

    const handleSendToChemistry = async () => {
        if (!selectedRequest) return;
        await handleUpdate({
            send_to_chemistry: true,
            status: "Sent_to_Chemistry",
            sent_to_chemistry_at: new Date().toISOString()
        });
    };

    // --------------------------------------------
    // FIX: Filtering only on normalized statuses
    // --------------------------------------------
    const filteredRequests = requests.filter(r => {
        if (filterStatus && r.status !== filterStatus) return false;
        if (filterAgent && !r.agent_name.includes(filterAgent)) return false;
        if (filterNew && !r.is_new_customer) return false;
        return true;
    });

    return (
        <div style={{ width: "100%", maxWidth: "100%", padding: "0 24px", direction: "rtl" }}>

            {/* HEADER */}
            <div className="flex justify-between items-center" style={{ marginBottom: '24px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '2rem', color: '#1a1a1a' }}>לוח פניות</h1>
                    <p style={{ margin: '4px 0 0 0', color: '#666' }}>
                        ניהול ומעקב אחר בקשות לפינוי פסולת
                    </p>
                </div>

                <button className="btn-secondary flex items-center gap-sm" onClick={loadRequests}>
                    <RefreshCw size={18} />
                    רענן נתונים
                </button>
            </div>

            {/* FILTERS */}
            <div className="card"
                style={{
                    padding: '16px',
                    marginBottom: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px',
                    flexWrap: 'wrap',
                    background: '#fff',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }}>

                <div className="flex items-center gap-sm"
                    style={{ color: '#555', fontWeight: 600 }}>
                    <Filter size={20} />
                    <span>סינון:</span>
                </div>

                <div style={{ width: '200px' }}>
                    <Select
                        label="סטטוס"
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        options={[
                            { value: '', label: 'כל הסטטוסים' },
                            { value: 'New', label: 'New' },
                            { value: 'Sent_to_Chemistry', label: 'Sent to Chemistry' },
                            { value: 'Chemistry_Replied', label: 'Chemistry Replied' },
                            { value: 'Chemistry_No_Reply', label: 'לא נענו בזמן על ידי כימיה' },
                            { value: 'Offer_Sent_to_Customer', label: 'Offer Sent' },
                            { value: 'Closed_Won', label: 'Closed Won' },
                            { value: 'Closed_Lost', label: 'Closed Lost' }
                        ]}
                    />
                </div>

                <div style={{ width: '250px', position: 'relative' }}>
                    <Input
                        label="סוכן"
                        value={filterAgent}
                        onChange={e => setFilterAgent(e.target.value)}
                        placeholder="חפש לפי שם סוכן..."
                        style={{ paddingRight: '35px' }}
                    />
                    <Search size={18}
                        style={{
                            position: 'absolute',
                            right: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: '#999'
                        }} />
                </div>

                <div style={{ marginRight: 'auto', display: 'flex', alignItems: 'center' }}>
                    <Checkbox
                        label="לקוחות חדשים בלבד"
                        checked={filterNew}
                        onChange={e => setFilterNew(e.target.checked)}
                    />
                </div>

            </div>

            {/* TABLE */}
            <div className="card"
                style={{
                    padding: 0,
                    overflow: 'hidden',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    background: '#fff',
                    height: 'calc(100vh - 250px)',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                {loading ? (
                    <div className="flex justify-center items-center"
                        style={{ height: '100%', color: '#666' }}>
                        <RefreshCw className="spin" size={32}
                            style={{ marginLeft: '10px' }} />
                        טוען נתונים...
                    </div>
                ) : error ? (
                    <div className="flex justify-center items-center"
                        style={{ height: '100%', color: 'var(--error-color)' }}>
                        {error}
                    </div>
                ) : (
                    <div style={{ overflowY: 'auto', flex: 1 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                            <thead style={{
                                position: 'sticky',
                                top: 0,
                                background: '#f8f9fa',
                                zIndex: 10,
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                            }}>
                                <tr>
                                    <th style={headerStyle}>ID</th>
                                    <th style={headerStyle}>תאריך</th>
                                    <th style={headerStyle}>סטטוס</th>
                                    <th style={headerStyle}>לקוח</th>
                                    <th style={headerStyle}>סוכן</th>
                                    <th style={headerStyle}>לקוח חדש?</th>
                                    <th style={headerStyle}>כימיה?</th>
                                    <th style={headerStyle}>מס' חומרים</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredRequests.length === 0 ? (
                                    <tr>
                                        <td colSpan={8}
                                            style={{
                                                padding: '40px',
                                                textAlign: 'center',
                                                color: '#888'
                                            }}>
                                            לא נמצאו פניות התואמות את הסינון
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRequests.map(req => (
                                        <tr
                                            key={req.request_id}
                                            onClick={() => handleRowClick(req)}
                                            style={{
                                                cursor: 'pointer',
                                                borderBottom: '1px solid #eee',
                                                transition: 'background 0.2s'
                                            }}
                                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f0f7ff')}
                                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
                                        >
                                            <td style={cellStyle}>
                                                <span style={{
                                                    fontFamily: 'monospace',
                                                    background: '#eee',
                                                    padding: '2px 6px',
                                                    borderRadius: '4px'
                                                }}>
                                                    {req.request_id?.slice(0, 8)}
                                                </span>
                                            </td>

                                            <td style={cellStyle}>
                                                {req.created_at
                                                    ? new Date(req.created_at).toLocaleDateString('he-IL')
                                                    : '-'}
                                            </td>

                                            <td style={cellStyle}>
                                                <StatusBadge status={req.status} />
                                            </td>

                                            <td style={cellStyle}>
                                                <div style={{ fontWeight: 600 }}>{req.company_name}</div>
                                                <div style={{ fontSize: '0.85rem', color: '#666' }}>
                                                    {req.contact_name}
                                                </div>
                                            </td>

                                            <td style={cellStyle}>{req.agent_name}</td>

                                            <td style={cellStyle}>
                                                {req.is_new_customer
                                                    ? <span className="text-success" style={{ fontWeight: 'bold' }}>כן</span>
                                                    : 'לא'}
                                            </td>

                                            <td style={cellStyle}>
                                                {req.send_to_chemistry ? '✅' : '-'}
                                            </td>

                                            <td style={cellStyle}>
                                                {req.waste_items?.length || 0}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* DRAWER */}
            <Drawer isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                title="פרטי פנייה">
                {selectedRequest && (
                    <div className="flex flex-col gap-lg"
                        style={{ paddingBottom: '40px' }}>

                        {/* HEADER */}
                        <div className="card"
                            style={{
                                background: '#fff',
                                borderRight: '4px solid var(--primary-color)'
                            }}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 style={{ margin: '0 0 8px 0', fontSize: '1.4rem' }}>
                                        {selectedRequest.company_name}
                                    </h2>
                                    <StatusBadge status={selectedRequest.status} />
                                </div>

                                <div style={{
                                    textAlign: 'left',
                                    color: '#666',
                                    fontSize: '0.9rem'
                                }}>
                                    <div>ID: {selectedRequest.request_id?.slice(0, 8)}</div>
                                    <div>
                                        {selectedRequest.created_at
                                            ? new Date(selectedRequest.created_at)
                                                .toLocaleString('he-IL')
                                            : ''}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* CUSTOMER INFO */}
                        <div>
                            <h3 style={sectionTitleStyle}>פרטי לקוח</h3>
                            <div className="card"
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '16px'
                                }}>

                                <InfoItem icon={<MapPin size={16} />}
                                    label="כתובת"
                                    value={selectedRequest.company_address} />

                                <InfoItem icon={<User size={16} />}
                                    label="איש קשר"
                                    value={selectedRequest.contact_name} />

                                <InfoItem icon={<Phone size={16} />}
                                    label="טלפון"
                                    value={selectedRequest.contact_phone} />

                                <InfoItem icon={<Mail size={16} />}
                                    label="אימייל"
                                    value={selectedRequest.contact_email} />

                                <InfoItem icon={<FileText size={16} />}
                                    label="תחום עיסוק"
                                    value={selectedRequest.business_activity} />

                                <InfoItem icon={<Truck size={16} />}
                                    label="סוכן מטפל"
                                    value={selectedRequest.agent_name} />

                            </div>
                        </div>

                        {/* WASTE ITEMS */}
                        <div>
                            <h3 style={sectionTitleStyle}>
                                רשימת חומרים ({selectedRequest.waste_items?.length || 0})
                            </h3>

                            <div className="flex flex-col gap-md">
                                {selectedRequest.waste_items?.map((item, idx) => (
                                    <div key={idx}
                                        className="card"
                                        style={{
                                            background: '#f8f9fa',
                                            border: '1px solid #e9ecef'
                                        }}>

                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            marginBottom: '8px',
                                            borderBottom: '1px solid #eee',
                                            paddingBottom: '8px'
                                        }}>
                                            <span style={{
                                                fontWeight: 'bold',
                                                color: 'var(--primary-color)'
                                            }}>
                                                #{idx + 1} {item.waste_stream_name || 'ללא שם'}
                                            </span>

                                            <span style={{
                                                fontSize: '0.9rem',
                                                background: '#e9ecef',
                                                padding: '2px 8px',
                                                borderRadius: '4px'
                                            }}>
                                                {item.physical_state}
                                            </span>
                                        </div>

                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: '1fr 1fr',
                                            gap: '12px',
                                            fontSize: '0.95rem'
                                        }}>
                                            <div><strong>תיאור:</strong> {item.waste_description}</div>
                                            <div><strong>כמות:</strong> {item.waste_amount}</div>
                                            <div><strong>אריזה:</strong> {item.packaging}</div>
                                            <div><strong>סיווג:</strong> {item.waste_classification}</div>
                                        </div>

                                    </div>
                                ))}
                            </div>

                        </div>

                        {/* LOGISTICS */}
                        <div>
                            <h3 style={sectionTitleStyle}>תפעול ולוגיסטיקה</h3>

                            <div className="card flex gap-lg">
                                <Checkbox label="נדרש מלגזה"
                                    checked={selectedRequest.needs_forklift}
                                    disabled />

                                <Checkbox label="נדרש שאיבה"
                                    checked={selectedRequest.needs_pumping}
                                    disabled />
                            </div>
                        </div>

                        {/* EDIT */}
                        <div style={{
                            marginTop: '20px',
                            borderTop: '1px solid #eee',
                            paddingTop: '20px'
                        }}>
                            <h3 style={sectionTitleStyle}>עדכון סטטוס והערות</h3>

                            <div className="card" style={{ background: '#fff' }}>
                                <div className="flex flex-col gap-md">

                                    <Select
                                        label="סטטוס טיפול"
                                        value={selectedRequest.status}
                                        onChange={e => setSelectedRequest({
                                            ...selectedRequest,
                                            status: e.target.value as RequestStatus
                                        })}
                                        options={[
                                            { value: 'New', label: 'New' },
                                            { value: 'Sent_to_Chemistry', label: 'Sent to Chemistry' },
                                            { value: 'Chemistry_Replied', label: 'Chemistry Replied' },
                                            { value: 'Chemistry_No_Reply', label: 'לא נענו בזמן על ידי כימיה' },
                                            { value: 'Offer_Sent_to_Customer', label: 'Offer Sent' },
                                            { value: 'Closed_Won', label: 'Closed Won' },
                                            { value: 'Closed_Lost', label: 'Closed Lost' },
                                        ]}
                                    />

                                    <Textarea
                                        label="הערות פנימיות"
                                        value={selectedRequest.notes || ''}
                                        onChange={e => setSelectedRequest({
                                            ...selectedRequest,
                                            notes: e.target.value
                                        })}
                                    />

                                    <div className="flex gap-sm" style={{ marginTop: '10px' }}>
                                        <button
                                            className="btn-primary"
                                            style={{ flex: 1 }}
                                            onClick={() => handleUpdate({
                                                notes: selectedRequest.notes,
                                                status: selectedRequest.status
                                            })}
                                        >
                                            שמור שינויים
                                        </button>

                                        {!selectedRequest.send_to_chemistry && (
                                            <button
                                                className="btn-secondary"
                                                style={{ flex: 1 }}
                                                onClick={handleSendToChemistry}
                                            >
                                                שליחה לכימיה
                                            </button>
                                        )}
                                    </div>

                                </div>
                            </div>
                        </div>

                        {/* FILES */}
                        {selectedRequest.photos && selectedRequest.photos.length > 0 && (
                            <div>
                                <h3 style={sectionTitleStyle}>קבצים מצורפים</h3>

                                <div className="card flex flex-wrap gap-sm">
                                    {selectedRequest.photos.map((url, idx) => (
                                        <a key={idx}
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '8px 12px',
                                                background: '#f0f7ff',
                                                borderRadius: '6px',
                                                textDecoration: 'none',
                                                color: '#0066cc',
                                                border: '1px solid #cce5ff'
                                            }}
                                        >
                                            <FileText size={16} />
                                            קובץ {idx + 1}
                                        </a>
                                    ))}
                                </div>

                            </div>
                        )}

                    </div>
                )}
            </Drawer>

        </div>
    );
};


// ----------------------------------------------------
// Styles
// ----------------------------------------------------
const headerStyle: React.CSSProperties = {
    padding: '16px',
    fontWeight: 600,
    color: '#444',
    borderBottom: '2px solid #eee',
    whiteSpace: 'nowrap'
};

const cellStyle: React.CSSProperties = {
    padding: '16px',
    color: '#333',
    verticalAlign: 'middle'
};

const sectionTitleStyle: React.CSSProperties = {
    fontSize: '1.1rem',
    fontWeight: 600,
    color: '#1a1a1a',
    marginBottom: '12px',
    borderBottom: '1px solid #eee',
    paddingBottom: '8px'
};


// ----------------------------------------------------
// Components
// ----------------------------------------------------
const InfoItem: React.FC<{ icon: React.ReactNode, label: string, value?: string }> =
    ({ icon, label, value }) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: '#888',
                fontSize: '0.85rem'
            }}>
                {icon}
                <span>{label}</span>
            </div>
            <div style={{ fontWeight: 500 }}>{value || '-'}</div>
        </div>
    );


const StatusBadge: React.FC<{ status: string }> = ({ status }) => {

    const colors: Record<string, string> = {
        'New': '#2196f3',
        'Sent_to_Chemistry': '#9c27b0',
        'Chemistry_Replied': '#ff9800',
        'Chemistry_No_Reply': '#e91e63',
        'Offer_Sent_to_Customer': '#00bcd4',
        'Closed_Won': '#4caf50',
        'Closed_Lost': '#f44336'
    };

    const labels: Record<string, string> = {
        'New': 'חדש',
        'Sent_to_Chemistry': 'נשלח לכימיה',
        'Chemistry_Replied': 'תשובת כימיה',
        'Chemistry_No_Reply': 'לא נענו בזמן על ידי כימיה',
        'Offer_Sent_to_Customer': 'הצעת מחיר נשלחה',
        'Closed_Won': 'זכייה',
        'Closed_Lost': 'הפסד'
    };

    return (
        <span style={{
            backgroundColor: colors[status] || '#999',
            color: 'white',
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '0.8rem',
            fontWeight: 500,
            display: 'inline-block'
        }}>
            {labels[status] || status}
        </span>
    );
};

export default RequestsBoardPage;
