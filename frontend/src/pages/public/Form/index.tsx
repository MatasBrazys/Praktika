// src/pages/public/Form/index.tsx
// Public form page — loads a SurveyJS form, attaches CRM behaviour, handles submission.

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Model } from 'survey-core';
import { Survey } from 'survey-react-ui';
import 'survey-core/survey-core.min.css';
import { formAPI } from '../../../services/api';
import { useToast } from '../../../contexts/ToastContext';
import NetworkImporter from '../../../components/public/NetworkImporter';
import { attachRealtimeBehavior } from './utils/crmBehavior';
import { detectBulkPanels } from './utils/bulkPanelDetector';
import type { BulkPanelWithPage } from '../../../types/survey.types';
import '../../../styles/pages/public/form.css';
import '../../../styles/components/network-importer.css';

export default function Form() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [form, setForm] = useState<any>(null);
    const [surveyModel, setSurveyModel] = useState<Model | null>(null);
    const [bulkPanels, setBulkPanels] = useState<BulkPanelWithPage[]>([]);
    const [currentPageNo, setCurrentPageNo] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const surveyWrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => { loadForm(); }, [id]);

    const loadForm = async () => {
        try {
            setLoading(true);
            const formData = await formAPI.get(Number(id));

            if (!formData.is_active) {
                setError('This form is not currently active');
                return;
            }

            const model = new Model(formData.surveyjs_json);
            (model as any).textUpdateMode = 'onTyping';
            attachRealtimeBehavior(model);

            model.onCurrentPageChanged.add((_sender, options) => {
                setCurrentPageNo(options.newCurrentPage?.visibleIndex ?? 0);
            });

            model.onComplete.add(async (survey) => {
                try {
                    if (!formData.id) { toast.error('Submission failed', 'Form ID is missing.'); return; }
                    await formAPI.submitForm(formData.id, formData.title, survey.data);
                    navigate(`/user/forms/${id}/success`);
                } catch {
                    toast.error('Submission failed', 'Please try again or contact support.');
                }
            });

            setForm(formData);
            setSurveyModel(model);
            setBulkPanels(detectBulkPanels(formData.surveyjs_json));
            setCurrentPageNo(0);
        } catch {
            setError('Form not found');
        } finally {
            setLoading(false);
        }
    };

    // Moves focus to the next input on Enter, skipping bulk importer fields
    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key !== 'Enter') return;
        const target = e.target as HTMLElement;

        const skipTags = ['TEXTAREA', 'BUTTON', 'SELECT'];
        if (skipTags.includes(target.tagName)) return;
        if (target instanceof HTMLInputElement && ['checkbox', 'radio', 'submit', 'button'].includes(target.type)) return;

        e.preventDefault();

        const wrapper = surveyWrapperRef.current;
        if (!wrapper) return;

        const focusable = Array.from(
            wrapper.querySelectorAll<HTMLElement>(
                'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])'
            )
        ).filter(el => !el.closest('.ni-wrapper'));

        const currentIndex = focusable.indexOf(target);
        const nextElement = focusable[currentIndex + 1];

        if (nextElement) {
            nextElement.focus();
            if (nextElement instanceof HTMLInputElement && nextElement.type === 'text') {
                nextElement.setSelectionRange(nextElement.value.length, nextElement.value.length);
            }
        }
    };

    const visiblePanels = bulkPanels.filter(p => p.pageIndex === currentPageNo);

    if (loading) return (
        <div className="public-page">
            <div className="loading-spinner">Loading form...</div>
        </div>
    );

    if (error) return (
        <div className="public-page">
            <div className="error-box">
                <h2>❌ {error}</h2>
                <p>Please contact support if you believe this is an error.</p>
            </div>
        </div>
    );

    if (!surveyModel) return null;

    return (
        <div className="public-page">
            <div className="public-form-container">
                <div className="form-header">
                    <h1>{form.title}</h1>
                    {form.description && <p className="form-description">{form.description}</p>}
                </div>
                <div className="survey-wrapper" ref={surveyWrapperRef} onKeyDown={handleKeyDown}>
                    {visiblePanels.map(panel => (
                        <NetworkImporter key={panel.questionName} surveyModel={surveyModel} config={panel} />
                    ))}
                    <Survey model={surveyModel} />
                </div>
            </div>
        </div>
    );
}