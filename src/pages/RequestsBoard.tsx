import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import type { WasteRequest } from '../types';
import { Drawer, Input, Select, Checkbox } from '../components/ui';
import { Filter, Search, RefreshCw } from 'lucide-react';

/* =========================================================
   Page
========================================================= */
const RequestsBoardPage: React.FC = () => {
    const [requests, setRequests] = useState<WasteRequest[]>([]);
    const [loading, setLoading] = useState(false);
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
        void loadRequests();
    }, []);

    /* =========================================================
       Data loader (rate-limited & locked)
    ========================================================= */
    const loadRequests = async (): Promise<void> => {
        if (inFlightRef.current) return;

        const now = Date.now();
        if (now - lastFetchAtRef.current < 2500) return; // 2.5s rate limit
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

    /* =========================================================
       Date helpers
    ========================================================= */
    const parseDateFlexible = (s?: string): Date | null => {
        if (!s) return null;

        // ISO or anything Date can parse
        const d0 = new Date(s);
        if (!isNaN(d0.getTime())) return d0;

        // "DD.MM.YYYY HH:mm" or "DD.MM.YYYY H:mm" etc.
        const m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
        if (!m) return null;

        const [, dd, mm, yyyy, hh = '0', mi = '0'] = m;
        return new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(mi), 0, 0);
    };

    /**
     * IMPORTANT: Days since LAST UPDATE (updated_at ONLY)
     * No fallback to created_at (as requested).
     */
    const getDaysSinceUpdate = (req: WasteRequest): number | null => {
        // Try multiple key variants just in case normalization changed naming
        const anyReq = req as any;
        const updatedRaw: string | undefined =
            anyReq.updated_at ??
            anyReq.updatedAt ??
            anyReq['updated_at'] ??
            anyReq['Updated At'] ??
            undefined;

        const dateObj = parseDateFlexible(updatedRaw);
        if (!dateObj) return null;

        const diffMs = Date.now() - dateObj.getTime();
        if (diffMs < 0) return 0;

        return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    };

    /* =========================================================
       Sorting + Filtering
       - Sort NEWEST -> OLDEST by created_at
       - Then apply filters
    ========================================================= */
    const sortedAndFiltered = requests
        .slice()
        .sort((a, b) => {
            const at = a.created_at ? new Date(a.created_at).getTime() : 0;
            const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
            return bt - at;
        })
        .filter((r) => {
            if (filterStatus && r.status !== filterStatus) return false;

            const agent = r.agent_name || '';
            if (filterAgent && !agent.includes(filterAgent)) return false;

            if (filterNew && !r.is_new_customer) return false;

            // Days since update filters (updated_at only)
            if (filterDaysUpdateMin || filterDaysUpdateMax) {
                const days = getDaysSinceUpdate(r);
                if (days === null) return false;

                if (filterDaysUpdateMin !== '' && days < Number(filterDaysUpdateMin)) return false;
                if (filterDaysUpdateMax !== '' && days > Number(filterDaysUpdateMax)) return false;
            }

            // Created date range filter
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

    /* =========================================================
       Render
    ========================================================= */
    return (
        <div style={{ width: '100%', padding: '0 24px', direction: 'rtl' }}>
            {/* HEADER */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold">לוח פניות</h1>
                    <p className="text-gray-500">ניהול ומעקב אחר בקשות לפינוי פסולת</p>
                </div>

                <button className="btn-secondary flex items-center gap-sm" onClick={() => void loadRequests()}>
                    <RefreshCw size={18} />
                    רענן נתונים
                </button>
            </div>

            {/* FILTERS */}
            <div
                className="card"
                style={{
                    padding: '16px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: '16px',
                    flexWrap: 'wrap',
                    background: '#fff',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                }}
            >
                <div className="flex items-center gap-sm" style={{ color: '#555', fontWeight: 600 }}>
                    <Filter size={18} />
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
                {/* Agent filter: same row as others, icon not overlapping */}
                <div style={{ width: 260 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Search size={16} style={{ color: '#999', flex: '0 0 auto' }} />

                        <Input
                            label="סוכן"
                            value={filterAgent}
                            onChange={(e) => setFilterAgent(e.target.value)}
                            placeholder="חפש לפי שם סוכן..."
                            style={{ paddingRight: undefined }}
                        />
                    </div>
                </div>

                {/* Days since update */}
                <div className="flex items-center gap-sm" style={{ fontSize: '0.9rem' }}>
                    <span style={{ fontWeight: 600 }}>ימים מאז עדכון:</span>
                    <input
                        type="number"
                        placeholder="מ-"
                        value={filterDaysUpdateMin}
                        onChange={(e) => setFilterDaysUpdateMin(e.target.value)}
                        style={{ width: 70, padding: '6px', borderRadius: 6, border: '1px solid #ccc' }}
                    />
                    <span>-</span>
                    <input
                        type="number"
                        placeholder="עד"
                        value={filterDaysUpdateMax}
                        onChange={(e) => setFilterDaysUpdateMax(e.target.value)}
                        style={{ width: 70, padding: '6px', borderRadius: 6, border: '1px solid #ccc' }}
                    />
                </div>

                {/* Created date range */}
                <div className="flex items-center gap-sm" style={{ fontSize: '0.9rem' }}>
                    <span style={{ fontWeight: 600 }}>תאריך פנייה:</span>
                    <input
                        type="date"
                        value={filterDateFrom}
                        onChange={(e) => setFilterDateFrom(e.target.value)}
                        style={{ padding: '6px', borderRadius: 6, border: '1px solid #ccc' }}
                    />
                    <span>-</span>
                    <input
                        type="date"
                        value={filterDateTo}
                        onChange={(e) => setFilterDateTo(e.target.value)}
                        style={{ padding: '6px', borderRadius: 6, border: '1px solid #ccc' }}
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
            <div className="card p-0 overflow-hidden" style={{ borderRadius: 12, background: '#fff' }}>
                {loading ? (
                    <div className="flex justify-center items-center h-64 text-gray-600">
                        <RefreshCw className="spin ml-2" /> טוען נתונים…
                    </div>
                ) : error ? (
                    <div className="flex justify-center items-center h-64 text-red-600">{error}</div>
                ) : (
                    <div style={{ overflowY: 'auto', maxHeight: '70vh' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                            <thead style={{ position: 'sticky', top: 0, background: '#f3f4f6', zIndex: 10 }}>
                                <tr>
                                    <th style={thStyle}>ID</th>
                                    <th style={thStyle}>תחילת פנייה</th>
                                    <th style={thStyle}>ימים מאז עדכון אחרון</th>
                                    <th style={thStyle}>סטטוס</th>
                                    <th style={thStyle}>לקוח</th>
                                    <th style={thStyle}>סוכן</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedAndFiltered.map((req) => (
                                    <tr
                                        key={req.request_id}
                                        onClick={() => handleRowClick(req)}
                                        style={{ cursor: 'pointer', borderBottom: '1px solid #eee' }}
                                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f0f7ff')}
                                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
                                    >
                                        <td style={tdStyle}>
                                            <span
                                                style={{
                                                    fontFamily: 'monospace',
                                                    background: '#eee',
                                                    padding: '2px 6px',
                                                    borderRadius: 6,
                                                }}
                                            >
                                                {req.request_id?.slice(0, 8)}
                                            </span>
                                        </td>

                                        <td style={tdStyle}>
                                            {req.created_at ? new Date(req.created_at).toLocaleDateString('he-IL') : '-'}
                                        </td>

                                        <td style={tdStyle}>
                                            {(() => {
                                                const days = getDaysSinceUpdate(req);
                                                return days === null ? '-' : days;
                                            })()}
                                        </td>

                                        <td style={tdStyle}>
                                            <StatusBadge status={req.status} />
                                        </td>

                                        <td style={tdStyle}>
                                            <div style={{ fontWeight: 700 }}>{req.company_name}</div>
                                            <div style={{ fontSize: '0.85rem', color: '#666' }}>{req.contact_name}</div>
                                        </td>

                                        <td style={tdStyle}>{req.agent_name}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {sortedAndFiltered.length === 0 && (
                            <div style={{ padding: 24, textAlign: 'center', color: '#777' }}>
                                לא נמצאו פניות התואמות את הסינון
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* DRAWER */}
            <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title="פרטי פנייה">
                {/* drawer content נשאר כמו שהיה */}
                {selectedRequest ? (
                    <div style={{ padding: 16, color: '#444' }}>
                        <div style={{ fontWeight: 700, marginBottom: 8 }}>{selectedRequest.company_name}</div>
                        <div>סטטוס: {selectedRequest.status}</div>
                    </div>
                ) : null}
            </Drawer>
        </div>
    );
};

/* =========================================================
   Styles
========================================================= */
const thStyle: React.CSSProperties = {
    padding: '14px 16px',
    fontWeight: 700,
    color: '#444',
    borderBottom: '2px solid #e5e7eb',
    whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
    padding: '14px 16px',
    color: '#333',
    verticalAlign: 'middle',
};

/* =========================================================
   Status badge
========================================================= */
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const map: Record<string, string> = {
        New: 'חדש',
        Sent_to_Chemistry: 'נשלח לכימיה',
        Chemistry_Replied: 'תשובת כימיה',
        Chemistry_No_Reply: 'לא נענו בזמן',
        Offer_Sent_to_Customer: 'הצעה נשלחה',
        Closed_Won: 'זכייה',
        Closed_Lost: 'הפסד',
    };

    const colors: Record<string, string> = {
        New: '#2196f3',
        Sent_to_Chemistry: '#9c27b0',
        Chemistry_Replied: '#ff9800',
        Chemistry_No_Reply: '#e91e63',
        Offer_Sent_to_Customer: '#00bcd4',
        Closed_Won: '#4caf50',
        Closed_Lost: '#f44336',
    };

    return (
        <span
            style={{
                background: colors[status] || '#999',
                color: '#fff',
                padding: '4px 10px',
                borderRadius: 20,
                fontSize: '0.8rem',
                fontWeight: 600,
                display: 'inline-block',
            }}
        >
            {map[status] || status}
        </span>
    );
};

export default RequestsBoardPage;
