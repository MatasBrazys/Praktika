import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Model } from 'survey-core';
import { Survey } from 'survey-react-ui';
import "survey-core/survey-core.min.css";
import { formAPI, crmAPI } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import NetworkImporter, { type BulkPanelConfig } from '../../components/public/NetworkImporter';
import '../../styles/pages/public/form.css';
import '../../styles/components/network-importer.css';

const CRM_SUFFIXES = ['name', 'street', 'postcode', 'state'] as const;

function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); }) as T;
}

function attachRealtimeBehavior(surveyModel: Model) {
  const allQ = () => surveyModel.getAllQuestions() as any[];

  const crmPrefixes: string[] = [];
  allQ().forEach(q => {
    if (allQ().some(s => s.name === `${q.name}_name`)) crmPrefixes.push(q.name);
  });

  crmPrefixes.forEach(prefix => {
    CRM_SUFFIXES.forEach(suffix => {
      const q = allQ().find(s => s.name === `${prefix}_${suffix}`);
      if (q) { q.visibleIf = ''; q.visible = false; }
    });
    const idQ = allQ().find(q => q.name === prefix);
    if (idQ) idQ.description = 'Enter a CRM ID to look up client details.';
  });

  type LookupState = 'idle' | 'searching' | 'found' | 'not_found' | 'error';
  const states: Record<string, LookupState> = {};
  crmPrefixes.forEach(p => { states[p] = 'idle'; });

  const setCrmState = (prefix: string, state: LookupState, meta?: { id?: string; company?: string }) => {
    states[prefix] = state;
    const idQ = allQ().find(q => q.name === prefix);
    if (!idQ) return;
    switch (state) {
      case 'idle':      idQ.description = 'Enter a CRM ID to look up client details.'; idQ.clearErrors?.(); break;
      case 'searching': idQ.description = `🔍 Searching for "${meta?.id}"…`;           idQ.clearErrors?.(); break;
      case 'found':     idQ.description = `✅ Found: ${meta?.company ?? 'Client'}`;    idQ.clearErrors?.(); break;
      case 'not_found': idQ.description = ''; idQ.addError?.(`CRM ID "${meta?.id}" not found. Please check and try again.`); break;
      case 'error':     idQ.description = ''; idQ.addError?.('CRM lookup failed. Please try again.'); break;
    }
  };

  const clearSubFields = (prefix: string) => {
    CRM_SUFFIXES.forEach(suffix => {
      const q = allQ().find(s => s.name === `${prefix}_${suffix}`);
      if (q) { q.value = undefined; q.visible = false; }
    });
  };

  const doLookup = debounce(async (prefix: string, crmId: string) => {
    setCrmState(prefix, 'searching', { id: crmId });
    clearSubFields(prefix);
    try {
      const result = await crmAPI.lookup(crmId);
      if (!result.found) { setCrmState(prefix, 'not_found', { id: crmId }); return; }
      CRM_SUFFIXES.forEach(suffix => {
        const q = allQ().find(s => s.name === `${prefix}_${suffix}`);
        if (q) { q.value = result[suffix] ?? ''; q.visible = true; }
      });
      setCrmState(prefix, 'found', { id: crmId, company: result.name });
    } catch {
      setCrmState(prefix, 'error');
    }
  }, 600);

  surveyModel.onValidateQuestion.add((_s, options) => {
    if (!crmPrefixes.includes(options.name)) return;
    if (!(options.value || '').trim()) return;
    const st = states[options.name];
    if (st === 'searching')                   options.error = 'Still searching — please wait.';
    if (st === 'not_found' || st === 'error') options.error = 'Enter a valid CRM ID before submitting.';
  });

  surveyModel.onValueChanged.add((_s, options) => {
    if (crmPrefixes.includes(options.name)) {
      const val = (options.value || '').trim().toUpperCase();
      if (!val) { clearSubFields(options.name); setCrmState(options.name, 'idle'); return; }
      doLookup(options.name, val);
      return;
    }

    const q = allQ().find(q => q.name === options.name);
    if (!q) return;

    const regexValidators = (q.validators || []).filter((v: any) => v.regex);
    if (!regexValidators.length) return;

    const val = String(options.value ?? '').trim();

    q.clearErrors?.();
    if (!val) return;

    for (const v of regexValidators) {
      try {
        if (!new RegExp(v.regex).test(val)) {
          q.addError?.(v.text || 'Invalid format');
          return;
        }
      } catch { /* skip */ }
    }
  });
}

interface BulkPanelWithPage extends BulkPanelConfig {
  pageIndex: number;
}

function detectBulkPanels(surveyJson: any): BulkPanelWithPage[] {
  const result: BulkPanelWithPage[] = [];

  if (surveyJson.pages) {
    surveyJson.pages.forEach((page: any, pageIndex: number) => {
      (page.elements || []).forEach((el: any) => {
        if (el.type === 'paneldynamic' && el.allowBulkImport === true && (el.bulkImportFields || []).length > 0) {
          result.push({
            questionName:     el.name,
            templateElements: el.templateElements || [],
            bulkImportFields: el.bulkImportFields || [],
            pageIndex,
          });
        }
      });
    });
  } else {
    (surveyJson.elements || []).forEach((el: any) => {
      if (el.type === 'paneldynamic' && el.allowBulkImport === true && (el.bulkImportFields || []).length > 0) {
        result.push({
          questionName:     el.name,
          templateElements: el.templateElements || [],
          bulkImportFields: el.bulkImportFields || [],
          pageIndex: 0,
        });
      }
    });
  }

  return result;
}

export default function Form() {
  const { id }    = useParams<{ id: string }>();
  const navigate  = useNavigate();
  const { toast } = useToast();

  const [form,          setForm]          = useState<any>(null);
  const [surveyModel,   setSurveyModel]   = useState<Model | null>(null);
  const [bulkPanels,    setBulkPanels]    = useState<BulkPanelWithPage[]>([]);
  const [currentPageNo, setCurrentPageNo] = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const surveyWrapperRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter') return;
    const target = e.target as HTMLElement;
    if (target.tagName === 'TEXTAREA') return;
    if (target.tagName === 'BUTTON')   return;
    if (target.tagName === 'SELECT')   return;
    if (target instanceof HTMLInputElement && ['checkbox', 'radio', 'submit', 'button'].includes(target.type)) return;
    e.preventDefault();
    const wrapper = surveyWrapperRef.current;
    if (!wrapper) return;
    const focusable = Array.from(
      wrapper.querySelectorAll<HTMLElement>(
        'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])'
      )
    ).filter(el => !el.closest('.ni-wrapper'));
    const idx = focusable.indexOf(target);
    if (idx === -1) return;
    const next = focusable[idx + 1];
    if (next) {
      next.focus();
      if (next instanceof HTMLInputElement && next.type === 'text')
        next.setSelectionRange(next.value.length, next.value.length);
    }
  };

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

      model.onComplete.add(async (s) => {
        try {
          if (!formData.id) { toast.error('Submission failed', 'Form ID is missing.'); return; }
          await formAPI.submitForm(formData.id, formData.title, s.data);
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
        <div
          className="survey-wrapper"
          ref={surveyWrapperRef}
          onKeyDown={handleKeyDown}
        >
          {visiblePanels.map(panel => (
            <NetworkImporter
              key={panel.questionName}
              surveyModel={surveyModel}
              config={panel}
            />
          ))}
          <Survey model={surveyModel} />
        </div>
      </div>
    </div>
  );
}