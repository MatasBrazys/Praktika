// src/pages/admin/FormBuilder/utils/visibleIfParser.ts
// Parses SurveyJS JSON back into internal FieldConfig objects.
// Used when loading an existing form for editing in FormBuilder.

import type { FieldConfig, Condition } from '../../../../types/form-builder.types';
import { CRM_PANEL_MARKER } from './surveyConverter';

export function elementToField(element: any, fallbackId: string): FieldConfig | null {
    try {
        if (element.type === 'panel' && element[CRM_PANEL_MARKER]) {
            return parseCrmPanel(element, fallbackId);
        }
        return parseRegularElement(element, fallbackId);
    } catch {
        return null;
    }
}

export function parseVisibleIf(expression: string): Condition[] {
    return expression
        .split(/ and | or /i)
        .map(part => parseConditionPart(part))
        .filter((condition): condition is Condition => condition !== null);
}

// ── Private helpers ───────────────────────────────────────────────────────────

function parseCrmPanel(panel: any, fallbackId: string): FieldConfig | null {
    const idElement = panel.elements?.[0];
    if (!idElement) return null;

    return {
        id: fallbackId,
        name: idElement.name,
        title: idElement.title || idElement.name,
        description: idElement.description,
        type: 'crmlookup',
        isRequired: idElement.isRequired || false,
        placeholder: idElement.placeholder,
        crmFieldLabels: {
            name: panel.elements?.[1]?.title,
            street: panel.elements?.[2]?.title,
            postcode: panel.elements?.[3]?.title,
            state: panel.elements?.[4]?.title,
        },
    };
}

function parseRegularElement(element: any, fallbackId: string): FieldConfig {
    const field: FieldConfig = {
        id: fallbackId,
        name: element.name || fallbackId,
        title: element.title || element.name || 'Untitled',
        description: element.description,
        type: element.type || 'text',
        isRequired: element.isRequired || false,
        inputType: element.inputType,
        choices: element.choices,
        defaultValue: element.defaultValue,
        placeholder: element.placeholder,
        validators: element.validators || [],
        addPanelText: element.addPanelText,
        removePanelText: element.removePanelText,
        minPanelCount: element.minPanelCount,
        panelCount: element.panelCount,
    };

    // ── Dynamic choices source ──
    if (element.dynamicChoicesSource?.fieldName) {
        field.dynamicChoicesSource = {
            fieldName: element.dynamicChoicesSource.fieldName,
            ...(element.dynamicChoicesSource.subFieldName
                ? { subFieldName: element.dynamicChoicesSource.subFieldName }
                : {}),
        };
    }

    if (element.visibleIf) {
        field.conditions = parseVisibleIf(element.visibleIf);
        field.conditionLogic = element.visibleIf.toLowerCase().includes(' or ') ? 'or' : 'and';
    }

    if (element.type === 'paneldynamic' && element.templateElements) {
        field.templateElements = element.templateElements
            .map((te: any, i: number) => elementToField(te, `template_${fallbackId}_${i}`))
            .filter(Boolean) as FieldConfig[];

        field.allowBulkImport = element.allowBulkImport || false;
        field.bulkImportFields = element.bulkImportFields || [];
    }

    return field;
}

function parseConditionPart(part: string): Condition | null {
    const emptyMatch = part.match(/\{(?:panel\.)?(\w+)\}\s+empty/);
    const notEmptyMatch = part.match(/\{(?:panel\.)?(\w+)\}\s+notempty/);
    const equalsMatch = part.match(/\{(?:panel\.)?(\w+)\}\s*=\s*'([^']+)'/);
    const notEqualsMatch = part.match(/\{(?:panel\.)?(\w+)\}\s*!=\s*'([^']+)'/);
    const containsMatch = part.match(/\{(?:panel\.)?(\w+)\}\s+contains\s+(?:\['([^']+)'\]|'([^']+)')/);

    if (emptyMatch) return { fieldName: emptyMatch[1], operator: 'empty', value: '' };
    if (notEmptyMatch) return { fieldName: notEmptyMatch[1], operator: 'notEmpty', value: '' };
    if (equalsMatch) return { fieldName: equalsMatch[1], operator: 'equals', value: equalsMatch[2] };
    if (notEqualsMatch) return { fieldName: notEqualsMatch[1], operator: 'notEquals', value: notEqualsMatch[2] };
    if (containsMatch) return { fieldName: containsMatch[1], operator: 'contains', value: containsMatch[2] || containsMatch[3] };

    return null;
}