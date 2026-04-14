// src/pages/admin/FormBuilder/utils/surveyConverter.ts
// Converts internal FieldConfig[] to SurveyJS JSON format.

import type { FieldConfig, Page, Condition } from '../../../../types/form-builder.types';

export const LOOKUP_PANEL_MARKER = '__lookup_panel__';

export function fieldToElement(field: FieldConfig, isTemplate = false): any {
    if (field.type === 'lookup') {
        return buildLookupPanel(field);
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

    // ── Dynamic choices source ──
    if (field.dynamicChoicesSource?.fieldName) {
        element.dynamicChoicesSource = {
            fieldName: field.dynamicChoicesSource.fieldName,
            ...(field.dynamicChoicesSource.subFieldName
                ? { subFieldName: field.dynamicChoicesSource.subFieldName }
                : {}),
        };
        delete element.choices;
    }

    if (field.validators?.length) {
        element.validators = field.validators.map(({ _id: _, ...v }) => v);
    }

    if (field.conditions?.length) {
        element.visibleIf = buildVisibleIf(field.conditions, field.conditionLogic, isTemplate);
    }

    // ── Unique constraint (template fields only) ──
    if (isTemplate && field.isUnique) {
        element.isUnique = true;
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

function buildLookupPanel(field: FieldConfig): any {
    const prefix = field.name;
    const mappings = field.lookupFieldMappings ?? [];

    return {
        type: 'panel',
        name: `panel_${prefix}`,
        [LOOKUP_PANEL_MARKER]: true,
        lookupConfigId: field.lookupConfigId,
        lookupFieldMappings: mappings.map(m => ({
            key: m.key,
            label: m.label,
            fieldName: `${prefix}_${m.key.replace(/\./g, '_')}`,
        })),
        elements: [
            {
                type: 'text',
                name: prefix,
                title: field.title,
                description: field.description || 'Type to search…',
                isRequired: field.isRequired,
                placeholder: field.placeholder || 'Search…',
            },
            ...mappings.map(m => ({
                type: 'text',
                name: `${prefix}_${m.key.replace(/\./g, '_')}`,
                title: m.label,
                readOnly: true,
                visibleIf: `{${prefix}} notempty`,
            })),
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