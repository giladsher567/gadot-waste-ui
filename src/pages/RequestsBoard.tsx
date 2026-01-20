import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';
import type { WasteRequest, RequestStatus } from '../types';
import { Drawer, Input, Select, Textarea, Checkbox } from '../components/ui';
import {
    Filter,
    Search,
    RefreshCw,
    FileText,
    Truck,
    MapPin,
    User,
    Phone,
    Mail,
    MessageSquare,
    Clock,
} from 'lucide-react';

interface LogItem {
    date: string;
    sender: string;
    message: string;
    type?: 'inbound' | 'outbound' | 'system';
}

/* =========================================================
   Page
========================================================= */
export const RequestsBoardPage: React.FC = () => {
    const [requests, setRequests] = useState<WasteRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedRequest, setSelectedRequest] = useState<WasteRequest | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    // --- UI State for Editing & Notes (The New Stuff) ---
    const [isEditing, setIsEditing] = useState(false);
    const [notifyOnSave, setNotifyOnSave] = useState(false); // Checkbox inside Edit Mode
    const [newNote, setNewNote] = useState(''); // Bottom section note

    /* -------- Filters (Restored) -------- */
    const [filterStatus, setFilterStatus] = useState('');
    const [filterAgent, setFilterAgent] = useState('');
    const [filterNew, setFilterNew] = useState(false);
    const [filterDaysUpdateMin, setFilterDaysUpdateMin] = useState('');
    const [filterDaysUpdateMax, setFilterDaysUpdateMax] = useState('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');

    /* -------- Stability Guards -------- */
    const inFlightRef = useRef(false);
    const lastFetchAtRef = useRef(0);
    const didInitialLoadRef = useRef(false);

    /* =========================================================
       Options Lists
    ========================================================= */
    const PACKAGING_OPTIONS = [
        { value: 'קוביה', label: 'קוביה' },
        { value: 'חבית פלסטיק', label: 'חבית פלסטיק' },
        { value: 'חבית מתכת', label: 'חבית מתכת' },
        { value: 'חביונית', label: 'חביונית' },
        { value: "ג'ריקן", label: "ג'ריקן" },
        { value: 'משטח', label: 'משטח' },
        { value: 'אריזות קטנות', label: 'אריזות קטנות' },
        { value: 'בקבוק', label: 'בקבוק' },
        { value: 'מיכלית', label: 'מיכלית' },
    ];

    const FREQUENCY_OPTIONS = [
        { value: 'שבועי', label: 'שבועי' },
        { value: 'חודשי', label: 'חודשי' },
        { value: 'רבעוני', label: 'רבעוני' },
        { value: 'חד פעמי', label: 'חד פעמי' },
        { value: 'חצי שנתי', label: 'חצי שנתי' },
        { value: 'שנתי', label: 'שנתי' },
    ];

    const PHYSICAL_STATE_OPTIONS = [
        { value: 'נוזל', label: 'נוזל' },
        { value: 'מוצק', label: 'מוצק' },
        { value: 'אבקה', label: 'אבקה' },
        { value: 'בוצה', label: 'בוצה' },
        { value: 'גז', label: 'גז' },
        { value: 'אחר', label: 'אחר' },
    ];

    /* =========================================================
       Initial load
    ========================================================= */
    useEffect(() => {
        if (didInitialLoadRef.current) return;
        didInitialLoadRef.current = true;
        loadRequests();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadRequests = async () => {
        if (inFlightRef.current) return;
        const now = Date.now();
        if (now - lastFetchAtRef.current < 3000) return;
        lastFetchAtRef.current = now;

        inFlightRef.current = true;
        setLoading(true);
        setError(null);

        try {
            const data = await api.listRequests();
            setRequests(Array.isArray(data) ? data : []);
        } catch {
            setError('שגיאה בטעינת הנתונים');
        } finally {
            setLoading(false);
            inFlightRef.current = false;
        }
    };

    /* =========================================================
       Update Handlers
    ========================================================= */
    const handleRowClick = (req: WasteRequest) => {
        setSelectedRequest(req);
        setIsDrawerOpen(true);
        setIsEditing(false);
        setNotifyOnSave(false);
        setNewNote('');
    };

    const handleUpdate = async (updates: Partial<WasteRequest> & { new_note?: string; trigger_email_notification?: boolean }) => {
        if (!selectedRequest) return;

        try {
            // Determine trigger logic: passed explicitly OR fallback to checkbox
            const finalUpdates = {
                ...updates,
                trigger_email_notification: updates.trigger_email_notification ?? notifyOnSave
            };

            await api.updateRequest(selectedRequest.request_id!, finalUpdates);

            // Refresh list
            const updatedList = await api.listRequests();
            setRequests(updatedList);

            // Update selected view
            const freshValues = updatedList.find(r => r.request_id === selectedRequest.request_id);
            if (freshValues) {
                setSelectedRequest(freshValues);
            }

            // Cleanups
            if (updates.new_note) {
                setNewNote('');
            } else {
                // Main form save
                setIsEditing(false);
                setNotifyOnSave(false);
            }

            alert('עודכן בהצלחה');
        } catch {
            alert('שגיאה בעדכון');
        }
    };

    /* =========================================================
       Helpers (Date, Days Since Update)
    ========================================================= */
    const parseDateFlexible = (s?: string): Date | null => {
        if (!s) return null;
        const iso = new Date(s);
        if (!isNaN(iso.getTime())) return iso;
        return null;
    };

    // Restored Logic: Days since updated_at
    const getDaysSinceUpdate = (req: WasteRequest): number | null => {
        const updatedRaw = (req as any).updated_at as string | undefined;
        const dateObj = parseDateFlexible(updatedRaw);
        if (!dateObj) return null;
        const diffMs = Date.now() - dateObj.getTime();
        if (diffMs < 0) return 0;
        return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    };

    /* =========================================================
       Filtering Logic (Restored)
    ========================================================= */
    const sortedRequests = useMemo(() => {
        const arr = [...requests];
        arr.sort((a, b) => {
            const ta = parseDateFlexible(a.created_at)?.getTime() ?? 0;
            const tb = parseDateFlexible(b.created_at)?.getTime() ?? 0;
            return tb - ta;
        });
        return arr;
    }, [requests]);

    const filteredRequests = useMemo(() => {
        return sortedRequests.filter((r) => {
            if (filterStatus && r.status !== filterStatus) return false;
            if (filterAgent && !(r.agent_name || '').includes(filterAgent)) return false;
            if (filterNew && !r.is_new_customer) return false;

            if (filterDaysUpdateMin || filterDaysUpdateMax) {
                const days = getDaysSinceUpdate(r);
                if (days === null) return false;
                if (filterDaysUpdateMin && days < Number(filterDaysUpdateMin)) return false;
                if (filterDaysUpdateMax && days > Number(filterDaysUpdateMax)) return false;
            }

            if (filterDateFrom || filterDateTo) {
                if (!r.created_at) return false;
                const created = new Date(r.created_at).setHours(0, 0, 0, 0);
                if (filterDateFrom && created < new Date(filterDateFrom).setHours(0, 0, 0, 0)) return false;
                if (filterDateTo && created > new Date(filterDateTo).setHours(0, 0, 0, 0)) return false;
            }

            return true;
        });
    }, [sortedRequests, filterStatus, filterAgent, filterNew, filterDaysUpdateMin, filterDaysUpdateMax, filterDateFrom, filterDateTo]);

    /* =========================================================
       Render
    ========================================================= */
    return (
        <div style={{ width: '100%', maxWidth: '100%', padding: '0 24px', direction: 'rtl' }}>
            {/* HEADER */}
            <div className="flex justify-between items-center" style={{ marginBottom: 24 }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '2rem', color: '#1a1a1a' }}>לוח פניות</h1>
                    <p style={{ margin: '4px 0 0 0', color: '#666' }}>ניהול ומעקב אחר בקשות לפינוי פסולת</p>
                </div>
                <button className="btn-secondary flex items-center gap-sm" onClick={loadRequests}>
                    <RefreshCw size={18} />
                    רענן נתונים
                </button>
            </div>

            {/* FILTERS (Restored Full UI) */}
            <div className="card" style={{ padding: 16, marginBottom: 24, display: 'flex', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap', background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <div className="flex items-center gap-sm" style={{ color: '#555', fontWeight: 600 }}>
                    <Filter size={20} />
                    <span>סינון:</span>
                </div>

                <div style={{ width: 220 }}>
                    <Select
                        label="סטטוס"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        options={[
                            { value: '', label: 'כל הסטטוסים' },
                            { value: 'New', label: 'New' },
                            { value: 'Sent_to_Chemistry', label: 'Sent to Chemistry' },
                            { value: 'Chemistry_Replied', label: 'Chemistry Replied' },
                            { value: 'Chemistry_No_Reply', label: 'לא נענו בזמן על ידי כימיה' },
                            { value: 'Offer_Sent_to_Customer', label: 'Offer Sent' },
                            { value: 'Closed_Won', label: 'Closed Won' },
                            { value: 'Closed_Lost', label: 'Closed Lost' },
                        ]}
                    />
                </div>

                <div style={{ width: 280, position: 'relative' }}>
                    <Input label="סוכן" value={filterAgent} onChange={(e) => setFilterAgent(e.target.value)} placeholder="חפש לפי שם סוכן..." style={{ paddingLeft: '34px' }} />
                    <Search size={16} style={{ position: 'absolute', left: 10, top: 'calc(50% + 10px)', transform: 'translateY(-50%)', color: '#999', pointerEvents: 'none' }} />
                </div>

                <div className="flex items-center gap-sm" style={{ fontSize: '0.9rem' }}>
                    <span style={{ fontWeight: 600 }}>ימים מאז עדכון:</span>
                    <input type="number" placeholder="מ-" value={filterDaysUpdateMin} onChange={(e) => setFilterDaysUpdateMin(e.target.value)} style={filterInputStyle} />
                    <span>-</span>
                    <input type="number" placeholder="עד" value={filterDaysUpdateMax} onChange={(e) => setFilterDaysUpdateMax(e.target.value)} style={filterInputStyle} />
                </div>

                <div className="flex items-center gap-sm" style={{ fontSize: '0.9rem' }}>
                    <span style={{ fontWeight: 600 }}>תאריך פנייה:</span>
                    <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} style={filterInputStyle} />
                    <span>-</span>
                    <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} style={filterInputStyle} />
                </div>

                <div style={{ marginRight: 'auto' }}>
                    <Checkbox label="לקוחות חדשים בלבד" checked={filterNew} onChange={(e) => setFilterNew(e.target.checked)} />
                </div>
            </div>

            {/* TABLE (Restored Columns) */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', background: '#fff', height: 'calc(100vh - 250px)', display: 'flex', flexDirection: 'column' }}>
                {loading ? (
                    <div className="flex justify-center items-center" style={{ height: '100%', color: '#666' }}>
                        <RefreshCw className="spin" size={32} style={{ marginLeft: 10 }} />
                        טוען נתונים...
                    </div>
                ) : error ? (
                    <div className="flex justify-center items-center" style={{ height: '100%', color: 'var(--error-color)' }}>
                        {error}
                    </div>
                ) : (
                    <div style={{ overflowY: 'auto', flex: 1 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                            <thead style={{ position: 'sticky', top: 0, background: '#f8f9fa', zIndex: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                <tr>
                                    <th style={headerStyle}>ID</th>
                                    <th style={headerStyle}>תאריך</th>
                                    <th style={headerStyle}>ימים מאז עדכון</th>
                                    <th style={headerStyle}>סטטוס</th>
                                    <th style={headerStyle}>חברה</th>
                                    <th style={headerStyle}>סוכן</th>
                                    <th style={headerStyle}>חדש?</th>
                                    <th style={headerStyle}>כימיה?</th>
                                    <th style={headerStyle}>פריטים</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRequests.length === 0 ? (
                                    <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#888' }}>לא נמצאו פניות התואמות את הסינון</td></tr>
                                ) : (
                                    filteredRequests.map((req) => (
                                        <tr key={req.request_id} onClick={() => handleRowClick(req)} style={{ cursor: 'pointer', borderBottom: '1px solid #eee' }} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f0f7ff')} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}>
                                            <td style={cellStyle}><span style={{ fontFamily: 'monospace', background: '#eee', padding: '2px 6px', borderRadius: 4 }}>{req.request_id?.slice(0, 8)}</span></td>
                                            <td style={cellStyle}>{req.created_at ? new Date(req.created_at).toLocaleDateString('he-IL') : '-'}</td>
                                            <td style={cellStyle}>{getDaysSinceUpdate(req) ?? '-'}</td>
                                            <td style={cellStyle}><StatusBadge status={req.status} /></td>
                                            <td style={cellStyle}><strong>{req.company_name}</strong><br /><span style={{ fontSize: '0.8rem', color: '#666' }}>{req.contact_name}</span></td>
                                            <td style={cellStyle}>{req.agent_name}</td>
                                            <td style={cellStyle}>{req.is_new_customer ? <span className="text-success">כן</span> : 'לא'}</td>
                                            <td style={cellStyle}>{req.send_to_chemistry ? '✅' : '-'}</td>
                                            <td style={cellStyle}>{req.waste_items?.length || 0}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* DRAWER (Merged New & Old) */}
            <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title="פרטי פנייה">
                {selectedRequest && (
                    <div className="flex flex-col gap-lg" style={{ paddingBottom: 40 }}>

                        {/* 1. Header & Edit Toggle */}
                        <div className="card" style={{ background: '#fff', borderRight: '4px solid var(--primary-color)' }}>
                            <div className="flex justify-between items-start">
                                <div style={{ flex: 1 }}>
                                    {isEditing ? (
                                        <Input
                                            label="שם החברה"
                                            value={selectedRequest.company_name}
                                            onChange={(e) => setSelectedRequest({ ...selectedRequest, company_name: e.target.value })}
                                            style={{ fontSize: '1.2rem', fontWeight: 'bold' }}
                                        />
                                    ) : (
                                        <h2 style={{ margin: '0 0 8px 0', fontSize: '1.4rem' }}>{selectedRequest.company_name}</h2>
                                    )}
                                    <div style={{ marginTop: 8 }}>
                                        {isEditing ? (
                                            <div className="flex gap-md">
                                                <Checkbox
                                                    label="לקוח חדש?"
                                                    checked={!!selectedRequest.is_new_customer}
                                                    onChange={(e) => setSelectedRequest({ ...selectedRequest, is_new_customer: e.target.checked })}
                                                />
                                                <div style={{ width: 200 }}>
                                                    <Select
                                                        label="סטטוס פנייה"
                                                        value={selectedRequest.status}
                                                        onChange={(e) => setSelectedRequest({ ...selectedRequest, status: e.target.value as RequestStatus })}
                                                        options={[
                                                            { value: 'New', label: 'New' },
                                                            { value: 'Sent_to_Chemistry', label: 'Sent to Chemistry' },
                                                            { value: 'Chemistry_Replied', label: 'Chemistry Replied' },
                                                            { value: 'Chemistry_No_Reply', label: 'לא נענו בזמן' },
                                                            { value: 'Offer_Sent_to_Customer', label: 'Offer Sent' },
                                                            { value: 'Closed_Won', label: 'Closed Won' },
                                                            { value: 'Closed_Lost', label: 'Closed Lost' },
                                                        ]}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex gap-sm items-center">
                                                <StatusBadge status={selectedRequest.status} />
                                                {selectedRequest.is_new_customer && (
                                                    <span style={{ backgroundColor: '#e8f5e9', color: '#2e7d32', padding: '2px 8px', borderRadius: 4, fontSize: '0.85rem' }}>לקוח חדש</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'left' }}>
                                    <button
                                        onClick={() => setIsEditing(!isEditing)}
                                        style={{ background: 'none', border: '1px solid #ccc', borderRadius: 4, padding: '4px 12px', cursor: 'pointer', fontSize: '0.9rem' }}
                                    >
                                        {isEditing ? 'בטל עריכה' : '✏️ ערוך פרטים'}
                                    </button>
                                </div>
                            </div>

                            {/* Static/Editable Description */}
                            <div style={{ marginTop: 16 }}>
                                <label style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>הערות:</label>
                                <Textarea
                                    label=""
                                    value={(selectedRequest as any).notes || ''}
                                    onChange={(e) => setSelectedRequest({ ...selectedRequest, notes: e.target.value as any })}
                                    disabled={!isEditing}
                                    placeholder={isEditing ? "הזן הערות קבועות..." : "אין הערות"}
                                    style={{ background: isEditing ? '#fff' : '#f9f9f9', border: isEditing ? '1px solid #ccc' : 'none', minHeight: 60 }}
                                />
                            </div>
                        </div>

                        {/* 2. Contact & Logistics */}
                        <div>
                            <h3 style={sectionTitleStyle}>פרטי לקוח ולוגיסטיקה</h3>
                            <div className="card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                {isEditing ? (
                                    <>
                                        <Input label="כתובת" value={selectedRequest.company_address} onChange={e => setSelectedRequest({ ...selectedRequest, company_address: e.target.value })} />
                                        <Input label="איש קשר" value={selectedRequest.contact_name} onChange={e => setSelectedRequest({ ...selectedRequest, contact_name: e.target.value })} />
                                        <Input label="טלפון" value={String(selectedRequest.contact_phone || '')} onChange={e => setSelectedRequest({ ...selectedRequest, contact_phone: e.target.value })} />
                                        <Input label="אימייל" value={selectedRequest.contact_email} onChange={e => setSelectedRequest({ ...selectedRequest, contact_email: e.target.value })} />
                                        <Input label="תחום עיסוק" value={selectedRequest.business_activity || ''} onChange={e => setSelectedRequest({ ...selectedRequest, business_activity: e.target.value })} />
                                        <Input label="סוכן מטפל" value={selectedRequest.agent_name || ''} onChange={e => setSelectedRequest({ ...selectedRequest, agent_name: e.target.value })} />
                                    </>
                                ) : (
                                    <>
                                        <InfoItem icon={<MapPin size={16} />} label="כתובת" value={selectedRequest.company_address} />
                                        <InfoItem icon={<User size={16} />} label="איש קשר" value={selectedRequest.contact_name} />
                                        <InfoItem icon={<Phone size={16} />} label="טלפון" value={String(selectedRequest.contact_phone || '')} />
                                        <InfoItem icon={<Mail size={16} />} label="אימייל" value={selectedRequest.contact_email} />
                                        <InfoItem icon={<FileText size={16} />} label="תחום עיסוק" value={selectedRequest.business_activity as any} />
                                        <InfoItem icon={<Truck size={16} />} label="סוכן מטפל" value={selectedRequest.agent_name} />
                                    </>
                                )}
                            </div>
                        </div>

                        {/* 3. Waste Items */}
                        <div>
                            <h3 style={sectionTitleStyle}>רשימת חומרים ({selectedRequest.waste_items?.length || 0})</h3>
                            <div className="flex flex-col gap-md">
                                {selectedRequest.waste_items?.map((item, idx) => (
                                    <div key={idx} className="card" style={{ background: '#f8f9fa', border: '1px solid #e9ecef' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #eee' }}>
                                            <div style={{ flex: 1 }}>
                                                {isEditing ? (
                                                    <Input
                                                        label={`שם זרם פסולת #${idx + 1}`}
                                                        value={item.waste_stream_name}
                                                        onChange={(e) => {
                                                            const newItems = [...(selectedRequest.waste_items || [])];
                                                            newItems[idx] = { ...newItems[idx], waste_stream_name: e.target.value };
                                                            setSelectedRequest({ ...selectedRequest, waste_items: newItems });
                                                        }}
                                                    />
                                                ) : (
                                                    <span style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>#{idx + 1} {item.waste_stream_name || 'ללא שם'}</span>
                                                )}
                                            </div>
                                            <div style={{ width: 120 }}>
                                                {isEditing ? (
                                                    <Select
                                                        label=""
                                                        value={(item as any).physical_state || ''}
                                                        options={PHYSICAL_STATE_OPTIONS}
                                                        onChange={(e) => {
                                                            const newItems = [...(selectedRequest.waste_items || [])];
                                                            newItems[idx] = { ...newItems[idx], physical_state: e.target.value };
                                                            setSelectedRequest({ ...selectedRequest, waste_items: newItems });
                                                        }}
                                                    />
                                                ) : (
                                                    <span className="badge" style={{ background: '#e9ecef' }}>{(item as any).physical_state || '-'}</span>
                                                )}
                                            </div>
                                        </div>
                                        {/* Details Grid */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                            <div style={{ gridColumn: '1 / -1' }}>
                                                <strong>תיאור:</strong>
                                                {isEditing ? (
                                                    <Input label="" value={(item as any).waste_description || ''} onChange={(e) => {
                                                        const newItems = [...(selectedRequest.waste_items || [])];
                                                        newItems[idx] = { ...newItems[idx], waste_description: e.target.value };
                                                        setSelectedRequest({ ...selectedRequest, waste_items: newItems });
                                                    }} />
                                                ) : (<span style={{ display: 'block', color: '#555' }}>{(item as any).waste_description || '-'}</span>)}
                                            </div>
                                            <div>
                                                <strong>כמות:</strong>
                                                {isEditing ? (<Input label="" type="number" value={item.waste_amount} onChange={(e) => {
                                                    const newItems = [...(selectedRequest.waste_items || [])];
                                                    // Fix: Keep as string, don't cast to Number because interface says string
                                                    newItems[idx] = { ...newItems[idx], waste_amount: e.target.value };
                                                    setSelectedRequest({ ...selectedRequest, waste_items: newItems });
                                                }} />) : (<span> {item.waste_amount}</span>)}
                                            </div>
                                            <div>
                                                <strong>אריזה:</strong>
                                                {isEditing ? (<Select label="" value={item.packaging} options={PACKAGING_OPTIONS} onChange={(e) => {
                                                    const newItems = [...(selectedRequest.waste_items || [])];
                                                    newItems[idx] = { ...newItems[idx], packaging: e.target.value };
                                                    setSelectedRequest({ ...selectedRequest, waste_items: newItems });
                                                }} />) : (<span> {item.packaging}</span>)}
                                            </div>
                                            <div>
                                                <strong>תדירות:</strong>
                                                {isEditing ? (<Select label="" value={item.pickup_frequency || ''} options={[{ value: '', label: 'בחר...' }, ...FREQUENCY_OPTIONS]} onChange={(e) => {
                                                    const newItems = [...(selectedRequest.waste_items || [])];
                                                    newItems[idx] = { ...newItems[idx], pickup_frequency: e.target.value };
                                                    setSelectedRequest({ ...selectedRequest, waste_items: newItems });
                                                }} />) : (<span> {item.pickup_frequency || '-'}</span>)}
                                            </div>
                                            <div>
                                                <strong>סיווג:</strong>
                                                {isEditing ? (<Input label="" value={(item as any).waste_classification || ''} onChange={(e) => {
                                                    const newItems = [...(selectedRequest.waste_items || [])];
                                                    newItems[idx] = { ...newItems[idx], waste_classification: e.target.value };
                                                    setSelectedRequest({ ...selectedRequest, waste_items: newItems });
                                                }} />) : (<span> {(item as any).waste_classification || '-'}</span>)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 4. Logistics & Save (Edit Mode) */}
                        <div className="card" style={{ background: isEditing ? '#e3f2fd' : '#fff' }}>
                            <div className="flex gap-lg" style={{ marginBottom: 16 }}>
                                {isEditing ? (
                                    <>
                                        <Checkbox label="נדרש מלגזה" checked={!!selectedRequest.needs_forklift} onChange={e => setSelectedRequest({ ...selectedRequest, needs_forklift: e.target.checked })} />
                                        <Checkbox label="נדרש שאיבה" checked={!!selectedRequest.needs_pumping} onChange={e => setSelectedRequest({ ...selectedRequest, needs_pumping: e.target.checked })} />
                                    </>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-xs"><span>{selectedRequest.needs_forklift ? '✅' : '❌'}</span><span>נדרש מלגזה</span></div>
                                        <div className="flex items-center gap-xs"><span>{selectedRequest.needs_pumping ? '✅' : '❌'}</span><span>נדרש שאיבה</span></div>
                                    </>
                                )}
                            </div>
                            {isEditing && (
                                <div style={{ borderTop: '1px solid #bbdefb', paddingTop: 16 }}>
                                    <div style={{ marginBottom: 12 }}>
                                        <Checkbox label="שלח עדכון לכימיה (במייל)" checked={notifyOnSave} onChange={e => setNotifyOnSave(e.target.checked)} />
                                    </div>
                                    <button className="btn-primary" style={{ width: '100%' }} onClick={() => handleUpdate(selectedRequest as any)}>
                                        שמור את כל השינויים (טופס מלא)
                                    </button>
                                </div>
                            )}
                        </div>

                        <hr style={{ margin: '10px 0', border: 'none', borderTop: '1px solid #ddd' }} />

                        {/* 5. Communication History */}
                        <div>
                            <div className="flex items-center gap-sm" style={{ marginBottom: 12, color: '#444', fontWeight: 600 }}>
                                <MessageSquare size={18} />
                                <span>היסטוריית התכתבות</span>
                            </div>
                            <div className="card" style={{ background: '#fcfcfc', maxHeight: '400px', overflowY: 'auto', border: '1px solid #ebebeb' }}>
                                {(() => {
                                    let logs: LogItem[] = [];
                                    try {
                                        if (selectedRequest.communication_log) {
                                            logs = JSON.parse(selectedRequest.communication_log);
                                        }
                                    } catch (e) {
                                        console.error("Failed log parse", e);
                                    }
                                    if (!Array.isArray(logs) || logs.length === 0) {
                                        return <div style={{ textAlign: 'center', color: '#999', padding: 20 }}>אין היסטוריית התכתבות</div>;
                                    }
                                    return (
                                        <div className="flex flex-col gap-sm">
                                            {logs.map((log, i) => (
                                                <div key={i} style={{
                                                    padding: '12px 14px', borderRadius: 8,
                                                    background: log.sender === 'System' ? '#f5f5f5' : log.sender === 'Chemistry' ? '#fff8e1' : '#e1f5fe',
                                                    borderRight: `4px solid ${log.sender === 'System' ? '#9e9e9e' : log.sender === 'Chemistry' ? '#ffb300' : '#039be5'}`,
                                                    fontSize: '0.9rem'
                                                }}>
                                                    <div className="flex justify-between items-center" style={{ marginBottom: 6 }}>
                                                        <strong>{log.sender === 'System' ? 'מערכת' : log.sender}</strong>
                                                        <div className="flex items-center gap-xs" style={{ fontSize: '0.75rem', color: '#777' }}>
                                                            <Clock size={12} /> {log.date}
                                                        </div>
                                                    </div>
                                                    <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{log.message}</div>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* 6. Add Note / Send to Chemistry (Simplified) */}
                        <div>
                            <h3 style={sectionTitleStyle}>הוספת הערה</h3>
                            <div className="card" style={{ background: '#fff' }}>
                                <Textarea
                                    label="הוסף הודעה לכימיה"
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    placeholder="רשום הודעה כאן..."
                                />
                                <div style={{ marginTop: 10 }}>
                                    <button
                                        className="btn-primary"
                                        style={{ width: '100%', background: '#2196f3' }}
                                        onClick={() => handleUpdate({ new_note: newNote, trigger_email_notification: true })}
                                        disabled={!newNote.trim()}
                                    >
                                        שלח הודעה לכימיה
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Files */}
                        {(selectedRequest as any).photos?.length > 0 && (
                            <div>
                                <h3 style={sectionTitleStyle}>קבצים מצורפים</h3>
                                <div className="card flex flex-wrap gap-sm">
                                    {(selectedRequest as any).photos.map((url: string, idx: number) => (
                                        <a key={idx} href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: '#f0f7ff', borderRadius: 6, textDecoration: 'none', color: '#0066cc', border: '1px solid #cce5ff' }}>
                                            <FileText size={16} /> קובץ {idx + 1}
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

/* =========================================================
   Styles & Sub-components
========================================================= */
const headerStyle: React.CSSProperties = { padding: 16, fontWeight: 600, color: '#444', borderBottom: '2px solid #eee', whiteSpace: 'nowrap' };
const cellStyle: React.CSSProperties = { padding: 16, color: '#333', verticalAlign: 'middle' };
const sectionTitleStyle: React.CSSProperties = { fontSize: '1.1rem', fontWeight: 600, color: '#1a1a1a', marginBottom: 12, borderBottom: '1px solid #eee', paddingBottom: 8 };
const filterInputStyle: React.CSSProperties = { padding: '6px 8px', borderRadius: 6, border: '1px solid #ccc' };

const InfoItem: React.FC<{ icon: React.ReactNode; label: string; value?: string }> = ({ icon, label, value }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#888', fontSize: '0.85rem' }}>{icon}<span>{label}</span></div>
        <div style={{ fontWeight: 500 }}>{value || '-'}</div>
    </div>
);

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const colors: Record<string, string> = {
        New: '#2196f3', Sent_to_Chemistry: '#9c27b0', Chemistry_Replied: '#ff9800',
        Chemistry_No_Reply: '#e91e63', Offer_Sent_to_Customer: '#00bcd4', Closed_Won: '#4caf50', Closed_Lost: '#f44336',
    };
    return <span style={{ backgroundColor: colors[status] || '#999', color: 'white', padding: '4px 10px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 500, display: 'inline-block' }}>{status}</span>;
};

export default RequestsBoardPage;