// PATCH for src/pages/admin/FormBuilder/utils/surveyConverter.ts
// Add this block AFTER the line: if (field.choices) element.choices = field.choices;
// (inside the fieldToElement function, before the validators block)
//
// ── Dynamic choices ──
// If the field uses dynamic choices, save the source config and skip static choices.
// At runtime, dynamicChoicesBehavior.ts will populate choices from the source field.

// ADD these lines to fieldToElement(), after choices and before validators:

/*
    if (field.dynamicChoicesSource?.fieldName) {
        element.dynamicChoicesSource = {
            fieldName: field.dynamicChoicesSource.fieldName,
            ...(field.dynamicChoicesSource.subFieldName
                ? { subFieldName: field.dynamicChoicesSource.subFieldName }
                : {}),
        };
        // Don't save static choices when dynamic source is configured
        delete element.choices;
    }
*/

// ─── FULL REPLACEMENT of fieldToElement function ─────────────────────────────

// Replace the existing fieldToElement function with this version that supports
// dynamicChoicesSource. Everything else is unchanged.

import type { FieldConfig, Page, Condition } from '../../../../types/form-builder.types';

export const CRM_PANEL_MARKER = '__crm_panel__';

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

    // ── Dynamic choices source (dropdown/radiogroup pulling from another field) ──
    if (field.dynamicChoicesSource?.fieldName) {
        element.dynamicChoicesSource = {
            fieldName: field.dynamicChoicesSource.fieldName,
            ...(field.dynamicChoicesSource.subFieldName
                ? { subFieldName: field.dynamicChoicesSource.subFieldName }
                : {}),
        };
        // Runtime choices come from source — don't bake static ones into JSON
        delete element.choices;
    }

    if (field.validators?.length) {
        element.validators = field.validators.map(({ _id: _, ...v }) => v);
    }

    if (field.conditions?.length) {
        element.visibleIf = buildVisibleIf(field.conditions, field.conditionLogic, isTemplate);
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

// ── Helpers ───────────────────────────────────────────────────────────────────

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

export function buildVisibleIf(
    conditions: Condition[],
    conditionLogic: 'and' | 'or' | undefined,
    isTemplate: boolean,
): string {
    const logic = conditionLogic || 'and';

    const expressions = conditions.map(condition => {
        const ref = isTemplate
            ? `{panel.${condition.fieldName}}`
            : `{${condition.fieldName}}`;

        switch (condition.operator) {
            case 'empty':    return `${ref} empty`;
            case 'notEmpty': return `${ref} notempty`;
            case 'contains': return `${ref} contains ['${condition.value}']`;
            case 'equals':   return `${ref} = '${condition.value}'`;
            case 'notEquals': return `${ref} != '${condition.value}'`;
            default: return '';
        }
    });

    return expressions.filter(Boolean).join(` ${logic} `);
}