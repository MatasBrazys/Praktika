// src/pages/admin/FormBuilder/utils/surveyConverter.ts
// Converts internal FieldConfig objects into SurveyJS-compatible JSON elements.
// Used when saving a form and when rendering the live preview.

import type { FieldConfig, Page } from '../../../../types/form-builder.types';

// Internal marker used to identify CRM lookup panels when reading back from JSON
export const CRM_PANEL_MARKER = '__crm_panel__';

// Converts a single FieldConfig into a SurveyJS element object.
// CRM lookup is a special case — generates a panel with 5 sub-fields (id + 4 autofill).
// isTemplate=true switches visibleIf references from {field} to {panel.field}
export function fieldToElement(field: FieldConfig, isTemplate = false): any {
    if (field.type === 'crmlookup') {
        return buildCrmPanel(field);
    }

    const element: any = {
        name: field.name,
        title: field.title,
        type: field.type,
        isRequired: field.isRequired,
    };

    if (field.description) element.description = field.description;
    if (field.placeholder) element.placeholder = field.placeholder;
    if (field.defaultValue) element.defaultValue = field.defaultValue;
    if (field.inputType && field.type === 'text') element.inputType = field.inputType;
    if (field.choices) element.choices = field.choices;
    if (field.validators?.length) element.validators = field.validators;

    if (field.conditions?.length) {
        element.visibleIf = buildVisibleIf(field, isTemplate);
    }

    if (field.type === 'paneldynamic') {
        element.panelCount = field.panelCount || 1;
        element.minPanelCount = field.minPanelCount || 1;
        element.addPanelText = field.addPanelText || 'Add';
        element.removePanelText = field.removePanelText || 'Remove';
        element.templateElements = (field.templateElements || []).map(tf => fieldToElement(tf, true));

        if (field.allowBulkImport) {
            element.allowBulkImport = true;
            element.bulkImportFields = field.bulkImportFields || [];
        }
    }

    return element;
}

// Converts all pages (or a single page) into the final SurveyJS JSON
export function convertToSurveyJS(pages: Page[]): any {
    if (pages.length === 1) {
        return { elements: pages[0].fields.map(f => fieldToElement(f)) };
    }
    return {
        pages: pages.map(p => ({
            name: p.name,
            title: p.title,
            elements: p.fields.map(f => fieldToElement(f)),
        })),
    };
}

// ── Private helpers ───────────────────────────────────────────────────────────

// Builds the CRM lookup panel with the ID input and 4 read-only autofill fields
function buildCrmPanel(field: FieldConfig): any {
    const prefix = field.name;
    const labels = field.crmFieldLabels || {};

    return {
        type: 'panel',
        name: `panel_${prefix}`,
        [CRM_PANEL_MARKER]: true,
        elements: [
            {
                type: 'text', name: prefix, title: field.title,
                description: field.description || 'Enter CRM ID to auto-fill client details',
                isRequired: field.isRequired, placeholder: field.placeholder || 'e.g. CRM001',
            },
            { type: 'text', name: `${prefix}_name`, title: labels.name || 'Company Name', readOnly: true, visibleIf: `{${prefix}} notempty` },
            { type: 'text', name: `${prefix}_street`, title: labels.street || 'Street Address', readOnly: true, visibleIf: `{${prefix}} notempty` },
            { type: 'text', name: `${prefix}_postcode`, title: labels.postcode || 'Postcode', readOnly: true, visibleIf: `{${prefix}} notempty` },
            { type: 'text', name: `${prefix}_state`, title: labels.state || 'City / State', readOnly: true, visibleIf: `{${prefix}} notempty` },
        ],
    };
}

// Builds a SurveyJS visibleIf expression string from the field's conditions array
function buildVisibleIf(field: FieldConfig, isTemplate: boolean): string {
    const logic = field.conditionLogic || 'and';

    const expressions = (field.conditions || []).map(condition => {
        const ref = isTemplate
            ? `{panel.${condition.fieldName}}`
            : `{${condition.fieldName}}`;

        switch (condition.operator) {
            case 'empty': return `${ref} empty`;
            case 'notEmpty': return `${ref} notempty`;
            case 'contains': return `${ref} contains ['${condition.value}']`;
            case 'equals': return `${ref} = '${condition.value}'`;
            case 'notEquals': return `${ref} != '${condition.value}'`;
            default: return '';
        }
    });

    return expressions.filter(Boolean).join(` ${logic} `);
}