import React, { useState } from 'react';
import { api } from '../api';
import type { CreateRequestPayload, WasteItem } from '../types';
import { Input, Select, Textarea, Checkbox } from '../components/ui';

export const NewRequestPage: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [files, setFiles] = useState<FileList | null>(null);

    const initialWasteItem: WasteItem = {
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

    const [formData, setFormData] = useState<CreateRequestPayload>({
        agent_name: '',
        company_name: '',
        company_address: '',
        contact_name: '',
        contact_email: '',
        contact_phone: '',
        business_activity: '',

        waste_items: [{ ...initialWasteItem }],
        total_items: 1,

        final_destination_internal: '',

        needs_forklift: false,
        needs_pumping: false,

        notes: '',
        is_new_customer: false,
        send_to_chemistry: false,
        status: 'New',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;

        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleWasteItemChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const newWasteItems = [...formData.waste_items];
        newWasteItems[index] = {
            ...newWasteItems[index],
            [name]: value
        };
        setFormData(prev => ({
            ...prev,
            waste_items: newWasteItems
        }));
    };

    const addWasteItem = () => {
        setFormData(prev => ({
            ...prev,
            waste_items: [...prev.waste_items, { ...initialWasteItem }],
            total_items: (prev.total_items || 1) + 1
        }));
    };

    const removeWasteItem = (index: number) => {
        if (formData.waste_items.length <= 1) return;
        const newWasteItems = formData.waste_items.filter((_, i) => i !== index);
        setFormData(prev => ({
            ...prev,
            waste_items: newWasteItems,
            total_items: newWasteItems.length
        }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(e.target.files);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const fileArray = files ? Array.from(files) : [];
            const photoFilenames = fileArray.map(f => f.name);

            const payload: CreateRequestPayload = {
                ...formData,
                photos: photoFilenames
            };

            await api.createRequest(payload);
            setSuccess(true);
            window.scrollTo(0, 0);
        } catch (err) {
            setError('אירעה שגיאה בשמירת הפנייה. אנא נסה שנית.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="container" style={{ textAlign: 'center', padding: '50px 20px' }}>
                <h1 className="text-success">הפנייה נשמרה בהצלחה!</h1>
                <p>הפרטים הועברו למערכת.</p>
                <button className="btn-primary" onClick={() => window.location.reload()}>פנייה חדשה</button>
            </div>
        );
    }

    return (
        <div className="container" style={{ marginRight: '20%' }}>
            <h1>פנייה חדשה</h1>

            {error && <div className="card" style={{ border: '1px solid var(--error-color)', color: 'var(--error-color)' }}>{error}</div>}

            <form onSubmit={handleSubmit}>
                {/* Customer Details */}
                <div className="card">
                    <h2>פרטי לקוח</h2>
                    <div className="flex flex-col gap-md">
                        <Input label="שם סוכן" name="agent_name" value={formData.agent_name} onChange={handleChange} required />
                        <div className="flex gap-md" style={{ flexDirection: 'row' }}>
                            <Checkbox label="לקוח חדש?" name="is_new_customer" checked={formData.is_new_customer} onChange={handleChange} />
                        </div>
                        <Input label="שם חברה" name="company_name" value={formData.company_name} onChange={handleChange} required />
                        <Input label="כתובת" name="company_address" value={formData.company_address} onChange={handleChange} required />
                        <Input label="איש קשר" name="contact_name" value={formData.contact_name} onChange={handleChange} required />
                        <Input label="אימייל" type="email" name="contact_email" value={formData.contact_email} onChange={handleChange} required />
                        <Input label="טלפון" type="tel" name="contact_phone" value={formData.contact_phone} onChange={handleChange} required />
                        <Input label="תחום עיסוק" name="business_activity" value={formData.business_activity} onChange={handleChange} />
                    </div>
                </div>

                {/* Waste Items Table */}
                <div className="card" style={{ overflowX: 'auto', padding: '0' }}>
                    <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee' }}>
                        <h2>פרטי הבקשה</h2>
                        <button type="button" className="btn-secondary" onClick={addWasteItem}>
                            + הוסף חומר נוסף
                        </button>
                    </div>

                    <div style={{ padding: '20px', minWidth: '100%' }}>
                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 25px' }}>
                            <thead>
                                <tr>
                                    <th style={{ width: '250px', textAlign: 'right', padding: '0 0 0 20px' }}></th>
                                    {formData.waste_items.map((_, index) => (
                                        <th key={index} style={{ minWidth: '280px', padding: '0 15px', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f5f5f5', padding: '15px', borderRadius: '8px' }}>
                                                <span style={{ fontWeight: 'bold' }}>חומר {index + 1}</span>
                                                {formData.waste_items.length > 1 && (
                                                    <button type="button" onClick={() => removeWasteItem(index)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>
                                                        ❌
                                                    </button>
                                                )}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {/* Waste Stream Name */}
                                <tr>
                                    <td style={{ fontWeight: 'bold', textAlign: 'right', padding: '0 0 0 20px' }}>שם זרם פסולת</td>
                                    {formData.waste_items.map((item, index) => (
                                        <td key={index} style={{ padding: '0 15px' }}>
                                            <Input label="" name="waste_stream_name" value={item.waste_stream_name} onChange={(e) => handleWasteItemChange(index, e)} style={{ marginBottom: 0 }} />
                                        </td>
                                    ))}
                                </tr>
                                {/* Process Description */}
                                <tr>
                                    <td style={{ fontWeight: 'bold', verticalAlign: 'top', paddingTop: '10px', textAlign: 'right', padding: '0 0 0 20px' }}>תיאור תהליך</td>
                                    {formData.waste_items.map((item, index) => (
                                        <td key={index} style={{ padding: '0 15px' }}>
                                            <Textarea label="" name="process_description" value={item.process_description} onChange={(e) => handleWasteItemChange(index, e)} style={{ marginBottom: 0 }} />
                                        </td>
                                    ))}
                                </tr>
                                {/* Waste Description */}
                                {/* 
                                <tr>
                                    <td style={{ fontWeight: 'bold', verticalAlign: 'top', paddingTop: '10px', textAlign: 'right', padding: '0 0 0 20px' }}>תיאור פסולת</td>
                                    {formData.waste_items.map((item, index) => (
                                        <td key={index} style={{ padding: '0 15px' }}>
                                            <Textarea label="" name="waste_description" value={item.waste_description} onChange={(e) => handleWasteItemChange(index, e)} style={{ marginBottom: 0 }} />
                                        </td>
                                    ))}
                                </tr>
                                */}

                                {/* Empty Packaging Protocol */}
                                <tr>
                                    <td style={{ fontWeight: 'bold', textAlign: 'right', padding: '0 0 0 20px' }}>פרוטוקול אריזות ריקות</td>
                                    {formData.waste_items.map((item, index) => (
                                        <td key={index} style={{ padding: '0 15px' }}>
                                            <Input label="" name="empty_packaging_protocol" value={item.empty_packaging_protocol} onChange={(e) => handleWasteItemChange(index, e)} style={{ marginBottom: 0 }} />
                                        </td>
                                    ))}
                                </tr>
                                {/* Raw / Waste */}
                                <tr>
                                    <td style={{ fontWeight: 'bold', textAlign: 'right', padding: '0 0 0 20px' }}>חומר גלם / פסולת</td>
                                    {formData.waste_items.map((item, index) => (
                                        <td key={index} style={{ padding: '0 15px' }}>
                                            <Select label="" name="raw_or_waste" value={item.raw_or_waste} onChange={(e) => handleWasteItemChange(index, e)} options={[
                                                { value: 'פסולת', label: 'פסולת' },
                                                { value: 'חומר גלם', label: 'חומר גלם' }
                                            ]} style={{ marginBottom: 0 }} />
                                        </td>
                                    ))}
                                </tr>
                                {/* Physical State */}
                                <tr>
                                    <td style={{ fontWeight: 'bold', textAlign: 'right', padding: '0 0 0 20px' }}>מצב צבירה</td>
                                    {formData.waste_items.map((item, index) => (
                                        <td key={index} style={{ padding: '0 15px' }}>
                                            <Select label="" name="physical_state" value={item.physical_state} onChange={(e) => handleWasteItemChange(index, e)} options={[
                                                { value: 'נוזל', label: 'נוזל' },
                                                { value: 'מוצק', label: 'מוצק' },
                                                { value: 'אבקה', label: 'אבקה' },
                                                { value: 'בוצה', label: 'בוצה' },
                                                { value: 'אחר', label: 'אחר' }
                                            ]} style={{ marginBottom: 0 }} />
                                        </td>
                                    ))}
                                </tr>
                                {/* Amount */}
                                <tr>
                                    <td style={{ fontWeight: 'bold', textAlign: 'right', padding: '0 0 0 20px' }}>כמות</td>
                                    {formData.waste_items.map((item, index) => (
                                        <td key={index} style={{ padding: '0 15px' }}>
                                            <Input label="" name="waste_amount" value={item.waste_amount} onChange={(e) => handleWasteItemChange(index, e)} style={{ marginBottom: 0 }} />
                                        </td>
                                    ))}
                                </tr>
                                {/* Packaging */}
                                <tr>
                                    <td style={{ fontWeight: 'bold', textAlign: 'right', padding: '0 0 0 20px' }}>אריזה</td>
                                    {formData.waste_items.map((item, index) => (
                                        <td key={index} style={{ padding: '0 15px' }}>
                                            <Select
                                                label=""
                                                name="packaging"
                                                value={item.packaging}
                                                onChange={(e) => handleWasteItemChange(index, e)}
                                                options={[
                                                    { value: 'קוביה', label: 'קוביה' },
                                                    { value: 'חבית פלסטיק', label: 'חבית פלסטיק' },
                                                    { value: 'חבית מתכת', label: 'חבית מתכת' },
                                                    { value: 'חביונית', label: 'חביונית' },
                                                    { value: 'ג\'ריקן', label: 'ג\'ריקן' },
                                                    { value: 'משטח', label: 'משטח' },
                                                    { value: 'אריזות קטנות', label: 'אריזות קטנות' },
                                                    { value: 'בקבוק', label: 'בקבוק' },
                                                    { value: 'מיכלית', label: 'מיכלית' }
                                                ]}
                                                style={{ marginBottom: 0 }}
                                            />
                                        </td>
                                    ))}
                                </tr>
                                {/* Pickup Frequency */}
                                <tr>
                                    <td style={{ fontWeight: 'bold', textAlign: 'right', padding: '0 0 0 20px' }}>תדירות פינוי</td>
                                    {formData.waste_items.map((item, index) => (
                                        <td key={index} style={{ padding: '0 15px' }}>
                                            <Select
                                                label=""
                                                name="pickup_frequency"
                                                value={item.pickup_frequency}
                                                onChange={(e) => handleWasteItemChange(index, e)}
                                                options={[
                                                    { value: 'שבועי', label: 'שבועי' },
                                                    { value: 'חודשי', label: 'חודשי' },
                                                    { value: 'רבעוני', label: 'רבעוני' },
                                                    { value: 'חד פעמי', label: 'חד פעמי' },
                                                    { value: 'חצי שנתי', label: 'חצי שנתי' },
                                                    { value: 'שנתי', label: 'שנתי' }
                                                ]}
                                                style={{ marginBottom: 0 }}
                                            />
                                        </td>
                                    ))}
                                </tr>
                                {/* MSDS / Analysis */}
                                <tr>
                                    <td style={{ fontWeight: 'bold', textAlign: 'right', padding: '0 0 0 20px' }}>MSDS / אנליזה</td>
                                    {formData.waste_items.map((item, index) => (
                                        <td key={index} style={{ padding: '0 15px' }}>
                                            <Input label="" name="msds_or_analysis" value={item.msds_or_analysis} onChange={(e) => handleWasteItemChange(index, e)} style={{ marginBottom: 0 }} />
                                        </td>
                                    ))}
                                </tr>
                                {/* Current Handling */}
                                <tr>
                                    <td style={{ fontWeight: 'bold', textAlign: 'right', padding: '0 0 0 20px' }}>טיפול נוכחי</td>
                                    {formData.waste_items.map((item, index) => (
                                        <td key={index} style={{ padding: '0 15px' }}>
                                            <Input label="" name="current_handling" value={item.current_handling} onChange={(e) => handleWasteItemChange(index, e)} style={{ marginBottom: 0 }} />
                                        </td>
                                    ))}
                                </tr>
                                {/* Target Price */}
                                <tr>
                                    <td style={{ fontWeight: 'bold', textAlign: 'right', padding: '0 0 0 20px' }}>מחיר יעד</td>
                                    {formData.waste_items.map((item, index) => (
                                        <td key={index} style={{ padding: '0 15px' }}>
                                            <Input label="" name="price" value={item.price} onChange={(e) => handleWasteItemChange(index, e)} style={{ marginBottom: 0 }} />
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Operations */}
                < div className="card" >
                    <h2>תפעול</h2>
                    <div className="flex flex-col gap-sm">
                        <Checkbox label="נדרש מלגזה?" name="needs_forklift" checked={formData.needs_forklift} onChange={handleChange} />
                        <Checkbox label="נדרש שאיבה?" name="needs_pumping" checked={formData.needs_pumping} onChange={handleChange} />
                    </div>
                </div >

                {/* Other */}
                < div className="card" >
                    <h2>הערות וקבצים</h2>
                    <div className="flex flex-col gap-md">
                        <Textarea label="הערות" name="notes" value={formData.notes} onChange={handleChange} />

                        <div className="form-group">
                            <label>תמונות / מסמכים</label>
                            <input type="file" multiple onChange={handleFileChange} style={{ paddingTop: '10px' }} />
                        </div>

                        <div style={{ marginTop: '10px', padding: '10px', background: '#e8f5e9', borderRadius: '8px' }}>
                            <Checkbox label="להעביר למחלקת כימיה?" name="send_to_chemistry" checked={formData.send_to_chemistry} onChange={handleChange} />
                        </div>
                    </div>
                </div >

                <div style={{ marginBottom: '50px' }}>
                    <button type="submit" className="btn-primary" style={{ width: '100%', padding: '15px', fontSize: '1.2rem' }} disabled={loading}>
                        {loading ? 'שולח...' : 'שמור פנייה'}
                    </button>
                </div>

            </form >
        </div >
    );
};
