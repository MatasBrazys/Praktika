import { useState, useEffect } from 'react';
import { formAPI, type FormDefinition } from '../../services/api';
import Navbar from '../../components/shared/Navbar';
import '../../styles/pages/UserFormsPage.css';
import { Link } from "react-router-dom";

export default function UserFormsPage() {
    const [forms, setForms] = useState<FormDefinition[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadForms();
    }, []);

    const loadForms = async () => {
        try {
            setLoading(true);
            // Only get active forms
            const data = await formAPI.list();
            const activeForms = data.filter(f => f.is_active);
            setForms(activeForms);
        } catch (err) {
            console.error('Failed to load forms:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <>
                <Navbar userRole="user" />
                <div className="page-loading">Loading available forms...</div>
            </>
        );
    }

    return (
        <>
            <Navbar userRole="user" />
            <div className="user-page-container">
                <div className="user-forms-wrapper">
                    <div className="page-header-simple">
                        <h1>Available Forms</h1>
                        <p>Select a form to register a client</p>
                    </div>

                    {forms.length === 0 ? (
                        <div className="empty-state-simple">
                            <div className="empty-icon">📋</div>
                            <h2>No forms available</h2>
                            <p>Please contact your administrator</p>
                        </div>
                    ) : (
                        <div className="forms-list-simple">
                            {forms.map(form => (
                                <Link
                                    key={form.id}
                                    to={`/user/forms/${form.id}`}
                                    className="form-list-item"
                                >
                                    <div className="form-item-header">
                                        <h3>{form.title}</h3>
                                        <span className="arrow">→</span>
                                    </div>
                                    <p className="form-item-description">
                                        {form.description || 'Click to fill out this form'}
                                    </p>
                                    <div className="form-item-meta">
                                        <span>📝 {form.surveyjs_json?.elements?.length || 0} fields</span>
                                    </div>
                                </Link>
                            ))}

                        </div>
                    )}
                </div>
            </div>
        </>
    );
}