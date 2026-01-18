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
} from 'lucide-react';

/* =========================================================
   Page
========================================================= */
export const RequestsBoardPage: React.FC = () => {
    const [requests, setRequests] = useState<WasteRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedRequest, setSelectedRequest] = useState<WasteRequest | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    /* -------- Filters -------- */
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
       Initial load – runs ONCE
    ========================================================= */
    useEffect(() => {
        if (didInitialLoadRef.current) return;
        didInitialLoadRef.current = true;
        loadRequests();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* =========================================================
       Data loader (rate-limited & locked)
    ========================================================= */
    const loadRequests = async () => {
        if (inFlightRef.current) return;

        const now = Date.now();
        if (now - lastFetchAtRef.current < 3000) return; // 3s rate limit
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
       Update handlers
    ========================================================= */
    const handleRowClick = (req: WasteRequest) => {
        setSelectedRequest(req);
        setIsDrawerOpen(true);
    };

    const handleUpdate = async (updates: Partial<WasteRequest>) => {
        if (!selectedRequest?.request_id) return;

        try {
            await api.updateRequest(selectedRequest.request_id, updates);

            setRequests((prev) =>
                prev.map((r) =>
                    r.request_id === selectedRequest.request_id ? { ...r, ...updates } : r
                )
            );

            setSelectedRequest((prev) => (prev ? { ...prev, ...updates } : null));
            alert('עודכן בהצלחה');
        } catch {
            alert('שגיאה בעדכון');
        }
    };

    const handleSendToChemistry = async () => {
        if (!selectedRequest) return;
        await handleUpdate({
            send_to_chemistry: true,
            status: 'Sent_to_Chemistry',
            sent_to_chemistry_at: new Date().toISOString(),
        });
    };

    /* =========================================================
       Date helpers
    ========================================================= */
    const parseDateFlexible = (s?: string): Date | null => {
        if (!s) return null;

        // ISO
        const iso = new Date(s);
        if (!isNaN(iso.getTime())) return iso;

        // "DD.MM.YYYY HH:mm" OR "DD.MM.YYYY"
        const m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
        if (!m) return null;

        const [, d, mo, y, h = '00', mi = '00'] = m;
        return new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi));
    };

    /* =========================================================
       IMPORTANT: Days since LAST UPDATE (updated_at ONLY)
       - If updated_at is missing/unparseable => returns null (shows "-")
    ========================================================= */
    const getDaysSinceUpdate = (req: WasteRequest): number | null => {
        const updatedRaw = (req as any).updated_at as string | undefined;
        const dateObj = parseDateFlexible(updatedRaw);
        if (!dateObj) return null;

        const diffMs = Date.now() - dateObj.getTime();
        if (diffMs < 0) return 0;

        return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    };

    /* =========================================================
       Sort newest -> oldest (by created_at)
    ========================================================= */
    const sortedRequests = useMemo(() => {
        const arr = [...requests];
        arr.sort((a, b) => {
            const ta = parseDateFlexible(a.created_at)?.getTime() ?? 0;
            const tb = parseDateFlexible(b.created_at)?.getTime() ?? 0;
            return tb - ta;
        });
        return arr;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [requests]);

    /* =========================================================
       Filtering
    ========================================================= */
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

                if (filterDateFrom) {
                    const from = new Date(filterDateFrom).setHours(0, 0, 0, 0);
                    if (created < from) return false;
                }

                if (filterDateTo) {
                    const to = new Date(filterDateTo).setHours(0, 0, 0, 0);
                    if (created > to) return false;
                }
            }

            return true;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        sortedRequests,
        filterStatus,
        filterAgent,
        filterNew,
        filterDaysUpdateMin,
        filterDaysUpdateMax,
        filterDateFrom,
        filterDateTo,
    ]);

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

            {/* FILTERS */}
            <div
                className="card"
                style={{
                    padding: 16,
                    marginBottom: 24,
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: 20,
                    flexWrap: 'wrap',
                    background: '#fff',
                    borderRadius: 12,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                }}
            >
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

                {/* Agent filter: SAME label behavior as others, icon NOT on top of input */}
                <div style={{ width: 280, position: 'relative' }}>
                    <Input
                        label="סוכן"
                        value={filterAgent}
                        onChange={(e) => setFilterAgent(e.target.value)}
                        placeholder="חפש לפי שם סוכן..."
                        // keep text clear; icon sits LEFT side (not covering the box)
                        style={{ paddingLeft: '34px' }}
                    />
                    <Search
                        size={16}
                        style={{
                            position: 'absolute',
                            left: 10,
                            top: 'calc(50% + 10px)', // aligns under the label area
                            transform: 'translateY(-50%)',
                            color: '#999',
                            pointerEvents: 'none',
                        }}
                    />
                </div>

                {/* Days Since Update */}
                <div className="flex items-center gap-sm" style={{ fontSize: '0.9rem' }}>
                    <span style={{ fontWeight: 600 }}>ימים מאז עדכון:</span>
                    <input
                        type="number"
                        placeholder="מ-"
                        value={filterDaysUpdateMin}
                        onChange={(e) => setFilterDaysUpdateMin(e.target.value)}
                        style={{
                            width: 64,
                            padding: '6px 8px',
                            borderRadius: 6,
                            border: '1px solid #ccc',
                        }}
                    />
                    <span>-</span>
                    <input
                        type="number"
                        placeholder="עד"
                        value={filterDaysUpdateMax}
                        onChange={(e) => setFilterDaysUpdateMax(e.target.value)}
                        style={{
                            width: 64,
                            padding: '6px 8px',
                            borderRadius: 6,
                            border: '1px solid #ccc',
                        }}
                    />
                </div>

                {/* Created Date Range */}
                <div className="flex items-center gap-sm" style={{ fontSize: '0.9rem' }}>
                    <span style={{ fontWeight: 600 }}>תאריך פנייה:</span>
                    <input
                        type="date"
                        value={filterDateFrom}
                        onChange={(e) => setFilterDateFrom(e.target.value)}
                        style={{
                            padding: '6px 8px',
                            borderRadius: 6,
                            border: '1px solid #ccc',
                        }}
                    />
                    <span>-</span>
                    <input
                        type="date"
                        value={filterDateTo}
                        onChange={(e) => setFilterDateTo(e.target.value)}
                        style={{
                            padding: '6px 8px',
                            borderRadius: 6,
                            border: '1px solid #ccc',
                        }}
                    />
                </div>

                <div style={{ marginRight: 'auto' }}>
                    <Checkbox
                        label="לקוחות חדשים בלבד"
                        checked={filterNew}
                        onChange={(e) => setFilterNew(e.target.checked)}
                    />
                </div>
            </div>

            {/* TABLE */}
            <div
                className="card"
                style={{
                    padding: 0,
                    overflow: 'hidden',
                    borderRadius: 12,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    background: '#fff',
                    height: 'calc(100vh - 250px)',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
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
                            <thead
                                style={{
                                    position: 'sticky',
                                    top: 0,
                                    background: '#f8f9fa',
                                    zIndex: 10,
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                }}
                            >
                                <tr>
                                    <th style={headerStyle}>ID</th>
                                    <th style={headerStyle}>תחילת פנייה</th>
                                    <th style={headerStyle}>ימים מאז עדכון אחרון</th>
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
                                        <td
                                            colSpan={9}
                                            style={{
                                                padding: 40,
                                                textAlign: 'center',
                                                color: '#888',
                                            }}
                                        >
                                            לא נמצאו פניות התואמות את הסינון
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRequests.map((req) => (
                                        <tr
                                            key={req.request_id}
                                            onClick={() => handleRowClick(req)}
                                            style={{
                                                cursor: 'pointer',
                                                borderBottom: '1px solid #eee',
                                                transition: 'background 0.2s',
                                            }}
                                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f0f7ff')}
                                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
                                        >
                                            <td style={cellStyle}>
                                                <span
                                                    style={{
                                                        fontFamily: 'monospace',
                                                        background: '#eee',
                                                        padding: '2px 6px',
                                                        borderRadius: 4,
                                                    }}
                                                >
                                                    {req.request_id?.slice(0, 8)}
                                                </span>
                                            </td>

                                            <td style={cellStyle}>
                                                {req.created_at ? new Date(req.created_at).toLocaleDateString('he-IL') : '-'}
                                            </td>

                                            <td style={cellStyle}>{getDaysSinceUpdate(req) ?? '-'}</td>

                                            <td style={cellStyle}>
                                                <StatusBadge status={req.status} />
                                            </td>

                                            <td style={cellStyle}>
                                                <div style={{ fontWeight: 600 }}>{req.company_name}</div>
                                                <div style={{ fontSize: '0.85rem', color: '#666' }}>{req.contact_name}</div>
                                            </td>

                                            <td style={cellStyle}>{req.agent_name}</td>

                                            <td style={cellStyle}>
                                                {req.is_new_customer ? (
                                                    <span className="text-success" style={{ fontWeight: 'bold' }}>
                                                        כן
                                                    </span>
                                                ) : (
                                                    'לא'
                                                )}
                                            </td>

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

            {/* DRAWER */}
            <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title="פרטי פנייה">
                {selectedRequest && (
                    <div className="flex flex-col gap-lg" style={{ paddingBottom: 40 }}>
                        {/* HEADER */}
                        <div
                            className="card"
                            style={{
                                background: '#fff',
                                borderRight: '4px solid var(--primary-color)',
                            }}
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 style={{ margin: '0 0 8px 0', fontSize: '1.4rem' }}>{selectedRequest.company_name}</h2>
                                    <StatusBadge status={selectedRequest.status} />
                                </div>

                                <div
                                    style={{
                                        textAlign: 'left',
                                        color: '#666',
                                        fontSize: '0.9rem',
                                    }}
                                >
                                    <div>ID: {selectedRequest.request_id?.slice(0, 8)}</div>
                                    <div>
                                        {selectedRequest.created_at ? new Date(selectedRequest.created_at).toLocaleString('he-IL') : ''}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* CUSTOMER INFO */}
                        <div>
                            <h3 style={sectionTitleStyle}>פרטי לקוח</h3>
                            <div
                                className="card"
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: 16,
                                }}
                            >
                                <InfoItem icon={<MapPin size={16} />} label="כתובת" value={selectedRequest.company_address} />
                                <InfoItem icon={<User size={16} />} label="איש קשר" value={selectedRequest.contact_name} />
                                <InfoItem icon={<Phone size={16} />} label="טלפון" value={String(selectedRequest.contact_phone || '')} />
                                <InfoItem icon={<Mail size={16} />} label="אימייל" value={selectedRequest.contact_email} />
                                <InfoItem icon={<FileText size={16} />} label="תחום עיסוק" value={selectedRequest.business_activity as any} />
                                <InfoItem icon={<Truck size={16} />} label="סוכן מטפל" value={selectedRequest.agent_name} />
                            </div>
                        </div>

                        {/* WASTE ITEMS */}
                        <div>
                            <h3 style={sectionTitleStyle}>רשימת חומרים ({selectedRequest.waste_items?.length || 0})</h3>

                            <div className="flex flex-col gap-md">
                                {selectedRequest.waste_items?.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="card"
                                        style={{
                                            background: '#f8f9fa',
                                            border: '1px solid #e9ecef',
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                marginBottom: 8,
                                                borderBottom: '1px solid #eee',
                                                paddingBottom: 8,
                                            }}
                                        >
                                            <span style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>
                                                #{idx + 1} {item.waste_stream_name || 'ללא שם'}
                                            </span>

                                            <span
                                                style={{
                                                    fontSize: '0.9rem',
                                                    background: '#e9ecef',
                                                    padding: '2px 8px',
                                                    borderRadius: 4,
                                                }}
                                            >
                                                {(item as any).physical_state || ''}
                                            </span>
                                        </div>

                                        <div
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns: '1fr 1fr',
                                                gap: 12,
                                                fontSize: '0.95rem',
                                            }}
                                        >
                                            <div>
                                                <strong>תיאור:</strong> {(item as any).waste_description || ''}
                                            </div>
                                            <div>
                                                <strong>כמות:</strong> {(item as any).waste_amount ?? ''}
                                            </div>
                                            <div>
                                                <strong>אריזה:</strong> {(item as any).packaging || ''}
                                            </div>
                                            <div>
                                                <strong>סיווג:</strong> {(item as any).waste_classification || ''}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* LOGISTICS */}
                        <div>
                            <h3 style={sectionTitleStyle}>תפעול ולוגיסטיקה</h3>

                            <div className="card flex gap-lg">
                                <Checkbox label="נדרש מלגזה" checked={!!selectedRequest.needs_forklift} disabled />
                                <Checkbox label="נדרש שאיבה" checked={!!selectedRequest.needs_pumping} disabled />
                            </div>
                        </div>

                        {/* EDIT */}
                        <div style={{ marginTop: 20, borderTop: '1px solid #eee', paddingTop: 20 }}>
                            <h3 style={sectionTitleStyle}>עדכון סטטוס והערות</h3>

                            <div className="card" style={{ background: '#fff' }}>
                                <div className="flex flex-col gap-md">
                                    <Select
                                        label="סטטוס טיפול"
                                        value={selectedRequest.status}
                                        onChange={(e) =>
                                            setSelectedRequest({
                                                ...selectedRequest,
                                                status: e.target.value as RequestStatus,
                                            })
                                        }
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
                                        value={(selectedRequest as any).notes || ''}
                                        onChange={(e) =>
                                            setSelectedRequest({
                                                ...selectedRequest,
                                                notes: e.target.value as any,
                                            })
                                        }
                                    />

                                    <div className="flex gap-sm" style={{ marginTop: 10 }}>
                                        <button
                                            className="btn-primary"
                                            style={{ flex: 1 }}
                                            onClick={() =>
                                                handleUpdate({
                                                    notes: (selectedRequest as any).notes,
                                                    status: selectedRequest.status,
                                                })
                                            }
                                        >
                                            שמור שינויים
                                        </button>

                                        {!selectedRequest.send_to_chemistry && (
                                            <button className="btn-secondary" style={{ flex: 1 }} onClick={handleSendToChemistry}>
                                                שליחה לכימיה
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* FILES */}
                        {(selectedRequest as any).photos && Array.isArray((selectedRequest as any).photos) && (selectedRequest as any).photos.length > 0 && (
                            <div>
                                <h3 style={sectionTitleStyle}>קבצים מצורפים</h3>

                                <div className="card flex flex-wrap gap-sm">
                                    {(selectedRequest as any).photos.map((url: string, idx: number) => (
                                        <a
                                            key={idx}
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 6,
                                                padding: '8px 12px',
                                                background: '#f0f7ff',
                                                borderRadius: 6,
                                                textDecoration: 'none',
                                                color: '#0066cc',
                                                border: '1px solid #cce5ff',
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

/* =========================================================
   Styles
========================================================= */
const headerStyle: React.CSSProperties = {
    padding: 16,
    fontWeight: 600,
    color: '#444',
    borderBottom: '2px solid #eee',
    whiteSpace: 'nowrap',
};

const cellStyle: React.CSSProperties = {
    padding: 16,
    color: '#333',
    verticalAlign: 'middle',
};

const sectionTitleStyle: React.CSSProperties = {
    fontSize: '1.1rem',
    fontWeight: 600,
    color: '#1a1a1a',
    marginBottom: 12,
    borderBottom: '1px solid #eee',
    paddingBottom: 8,
};

/* =========================================================
   Components
========================================================= */
const InfoItem: React.FC<{ icon: React.ReactNode; label: string; value?: string }> = ({
    icon,
    label,
    value,
}) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                color: '#888',
                fontSize: '0.85rem',
            }}
        >
            {icon}
            <span>{label}</span>
        </div>
        <div style={{ fontWeight: 500 }}>{value || '-'}</div>
    </div>
);

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const colors: Record<string, string> = {
        New: '#2196f3',
        Sent_to_Chemistry: '#9c27b0',
        Chemistry_Replied: '#ff9800',
        Chemistry_No_Reply: '#e91e63',
        Offer_Sent_to_Customer: '#00bcd4',
        Closed_Won: '#4caf50',
        Closed_Lost: '#f44336',
    };

    const labels: Record<string, string> = {
        New: 'חדש',
        Sent_to_Chemistry: 'נשלח לכימיה',
        Chemistry_Replied: 'תשובת כימיה',
        Chemistry_No_Reply: 'לא נענו בזמן על ידי כימיה',
        Offer_Sent_to_Customer: 'הצעת מחיר נשלחה',
        Closed_Won: 'זכייה',
        Closed_Lost: 'הפסד',
    };

    return (
        <span
            style={{
                backgroundColor: colors[status] || '#999',
                color: 'white',
                padding: '4px 10px',
                borderRadius: 20,
                fontSize: '0.8rem',
                fontWeight: 500,
                display: 'inline-block',
            }}
        >
            {labels[status] || status}
        </span>
    );
};

export default RequestsBoardPage;
