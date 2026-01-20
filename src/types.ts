export type RequestStatus =
    | "New"
    | "Sent_to_Chemistry"
    | "Need_More_Info"
    | "Chemistry_Replied"
    | "Chemistry_No_Reply"
    | "Offer_Sent_to_Customer"
    | "Closed_Won"
    | "Closed_Lost";

export type PhysicalState = "אבקה" | "נוזל" | "מוצק" | "בוצה" | "אחר";
export type RawOrWaste = "חומר גלם" | "פסולת";

export interface WasteItem {
    waste_stream_name: string;
    process_description: string;
    waste_description: string;
    empty_packaging_protocol: string;
    waste_amount: string;
    raw_or_waste: string;
    pickup_frequency: string;
    packaging: string;
    physical_state: string;
    msds_or_analysis: string;
    current_handling: string;
    price: string;
}

export interface WasteRequest {
    // General
    request_id?: string; // Optional for new requests
    created_at?: string;
    agent_name: string;

    // Customer details
    company_name: string;
    company_address: string;
    contact_name: string;
    contact_email: string;
    contact_phone: string;
    business_activity?: string;

    // Waste Items
    waste_items: WasteItem[];
    total_items?: number;

    // Request details (Common / Global)
    final_destination_internal?: string;

    // Operations
    needs_forklift: boolean;
    needs_pumping: boolean;

    // Other
    notes?: string;
    is_new_customer: boolean;
    send_to_chemistry: boolean;
    status: RequestStatus;
    sent_to_chemistry_at?: string;
    photos?: string[]; // URLs
    chemistry_reply_text?: string;
}

export interface CreateRequestPayload extends Omit<WasteRequest, 'request_id' | 'created_at'> {
    // Photos are handled as a list of filenames in the JSON payload
}
