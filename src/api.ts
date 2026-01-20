import type { WasteRequest, CreateRequestPayload, WasteItem, RequestStatus } from './types';

const API_NEW_REQUEST = import.meta.env.VITE_API_NEW_REQUEST;
const API_UPDATE_REQUEST = import.meta.env.VITE_API_UPDATE_REQUEST;
const API_LIST_REQUESTS = import.meta.env.VITE_API_LIST_REQUESTS;

// Debug – optional
console.log("ENV CHECK:", {
    NEW: API_NEW_REQUEST,
    UPDATE: API_UPDATE_REQUEST,
    LIST: API_LIST_REQUESTS,
});

// ============================================
// NORMALIZATION LAYER
// ============================================

const normalizeBoolean = (val: any): boolean => {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'number') return val === 1;
    if (typeof val === 'string') {
        const lower = val.toLowerCase().trim();
        return ['true', 'yes', '1', 'on', 'active'].includes(lower);
    }
    return false;
};

const normalizeDate = (val: any): string | undefined => {
    if (!val) return undefined;
    if (typeof val !== 'string') return undefined;

    // Already ISO-like? (e.g. 2025-12-01T10:15:00)
    if (val.includes('T') && val.includes('-')) return val;

    // Handle "30.11.2025 09:32" or "30.11.2025"
    if (val.includes('.')) {
        const [datePart, timePart] = val.split(' ');
        const parts = datePart.split('.');
        if (parts.length === 3) {
            const [day, month, year] = parts;
            const fullYear = year.length === 2 ? `20${year}` : year;

            // time can be "HH:mm" or "HH:mm:ss"
            const timeRaw = (timePart || '00:00').trim();
            const time = timeRaw.length === 5 ? `${timeRaw}:00` : timeRaw;

            return `${fullYear}-${month}-${day}T${time}`;
        }
    }

    // Fallback: return original string (better than losing data)
    return val;
};

const normalizeStatus = (val: any): RequestStatus => {
    if (!val) return 'New';
    const s = String(val).trim();

    const map: Record<string, RequestStatus> = {
        'New': 'New',
        'Sent to Chemistry': 'Sent_to_Chemistry',
        'Sent_to_Chemistry': 'Sent_to_Chemistry',
        'Need More Info': 'Need_More_Info',
        'Need_More_Info': 'Need_More_Info',
        'Chemistry Replied': 'Chemistry_Replied',
        'Chemistry_Replied': 'Chemistry_Replied',
        'Chemistry No Reply': 'Chemistry_No_Reply',
        'chemistry no reply': 'Chemistry_No_Reply',
        'Chemistry_No_Reply': 'Chemistry_No_Reply',
        'לא נענו בזמן על ידי כימיה': 'Chemistry_No_Reply',
        'Offer Sent to Customer': 'Offer_Sent_to_Customer',
        'Offer Sent': 'Offer_Sent_to_Customer',
        'Offer_Sent_to_Customer': 'Offer_Sent_to_Customer',
        'Closed Won': 'Closed_Won',
        'Closed_Won': 'Closed_Won',
        'Closed Lost': 'Closed_Lost',
        'Closed_Lost': 'Closed_Lost'
    };

    return map[s] || (s.replace(/ /g, '_') as RequestStatus);
};

const normalizeWasteItem = (item: any): WasteItem => {
    if (!item || typeof item !== 'object') {
        return {
            waste_stream_name: '',
            process_description: '',
            waste_description: '',
            empty_packaging_protocol: '',
            waste_amount: '',
            raw_or_waste: 'פסולת',
            pickup_frequency: '',
            packaging: '',
            physical_state: 'נוזל',
            msds_or_analysis: '',
            current_handling: '',
            price: ''
        };
    }

    return {
        waste_item_id: item.waste_item_id || item.id || '',
        waste_stream_name: item.waste_stream_name || item['Stream Name'] || '',
        process_description: item.process_description || item['Process Description'] || '',
        waste_description: item.waste_description || item['Waste Description'] || '',
        empty_packaging_protocol: item.empty_packaging_protocol || '',
        waste_amount: item.waste_amount ?? item['Amount'] ?? '',
        raw_or_waste: item.raw_or_waste || 'פסולת',
        pickup_frequency: item.pickup_frequency || '',
        packaging: item.packaging || '',
        physical_state: item.physical_state || 'נוזל',
        msds_or_analysis: item.msds_or_analysis || '',
        current_handling: item.current_handling || '',
        price: item.price || '',
    };
};

const normalizeWasteRequest = (data: any): WasteRequest => {
    if (!data) throw new Error("Invalid request data");

    // Extract Waste Items (could be "waste_items", "Waste Items", or nested)
    let rawItems = data.waste_items || data['Waste Items'] || [];
    if (!Array.isArray(rawItems)) rawItems = [];

    // IMPORTANT:
    // We build as "any" so we can include fields like updated_at even if your WasteRequest type doesn't include it yet.
    const req: any = {
        request_id: String(data.request_id || data.id || Math.random().toString(36).substr(2, 9)),

        created_at: normalizeDate(data.created_at || data['Created At']),
        // ✅ THIS is what you were missing:
        updated_at: normalizeDate(data.updated_at || data['Updated At']),

        agent_name: data.agent_name || data['Agent Name'] || '',

        company_name: data.company_name || data['Company Name'] || '',
        company_address: data.company_address || data['Company Address'] || '',
        contact_name: data.contact_name || data['Contact Name'] || '',
        contact_email: data.contact_email || data['Contact Email'] || '',
        contact_phone: data.contact_phone || data['Contact Phone'] || '',
        business_activity: data.business_activity,

        waste_items: rawItems.map(normalizeWasteItem),
        total_items: typeof data.total_items === 'number' ? data.total_items : rawItems.length,

        final_destination_internal: data.final_destination_internal,
        needs_forklift: normalizeBoolean(data.needs_forklift),
        needs_pumping: normalizeBoolean(data.needs_pumping),

        notes: data.notes,
        is_new_customer: normalizeBoolean(data.is_new_customer),
        send_to_chemistry: normalizeBoolean(data.send_to_chemistry),
        status: normalizeStatus(data.status),

        sent_to_chemistry_at: normalizeDate(data.sent_to_chemistry_at),
        photos: Array.isArray(data.photos) ? data.photos : [],
        chemistry_reply_text: data.chemistry_reply_text,
        communication_log: data.communication_log || '[]',
    };

    return req as WasteRequest;
};

// ============================================
// API METHODS
// ============================================

export const api = {

    // CREATE
    createRequest: async (request: CreateRequestPayload): Promise<void> => {
        const response = await fetch(API_NEW_REQUEST, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            const text = await response.text();
            console.error("CreateRequest failed:", text);
            throw new Error('Failed to create request');
        }
    },

    // UPDATE
    updateRequest: async (request_id: string, updates: CreateRequestPayload | Partial<WasteRequest> | any): Promise<void> => {
        const response = await fetch(API_UPDATE_REQUEST, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ request_id, ...updates }),
        });

        if (!response.ok) {
            const text = await response.text();
            console.error("UpdateRequest failed:", text);
            throw new Error('Failed to update request');
        }
    },

    // LIST
    listRequests: async (): Promise<WasteRequest[]> => {
        const response = await fetch(API_LIST_REQUESTS, {
            // prevents the browser from serving cached response unexpectedly in dev
            cache: 'no-store',
        });

        if (!response.ok) throw new Error("Failed to fetch requests");

        const raw = await response.json();
        let items: any[] = [];

        if (Array.isArray(raw)) {
            items = raw;
        } else if (typeof raw === 'object' && raw !== null) {
            items = [raw];
        } else {
            console.warn("Unexpected API response format:", raw);
            return [];
        }

        return items.map(normalizeWasteRequest);
    }
};
