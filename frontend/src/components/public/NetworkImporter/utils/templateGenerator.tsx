// src/components/public/NetworkImporter/utils/templateGenerator.ts
// Generates a CSV template file for the bulk import feature.

import type { BulkPanelConfig } from '../../../../types/survey.types';
import { getChoices } from './cellValidator';

// Builds a two-line CSV string: a header row and one example data row.
// Example values are inferred from the field type and validator patterns.
export function generateTemplateCSV(config: BulkPanelConfig): string {
    const { bulkImportFields, templateElements } = config;

    const headers = bulkImportFields.map(f => f.name).join(',');
    const exampleRow = bulkImportFields.map(f => buildExampleValue(f.name, templateElements)).join(',');

    return `${headers}\n${exampleRow}\n`;
}

// ── Private helpers ───────────────────────────────────────────────────────────

// Returns a sensible example value for a given field based on its type
function buildExampleValue(fieldName: string, templateElements: any[]): string {
    const element = templateElements.find((t: any) => t.name === fieldName);
    if (!element) return 'value';

    const fieldType = element.type ?? 'text';

    if (fieldType === 'boolean') return 'yes';

    if (fieldType === 'dropdown' || fieldType === 'radiogroup') {
        const choices = getChoices(element);
        return choices[0] ?? 'option';
    }

    if (fieldType === 'checkbox') {
        const choices = getChoices(element);
        return choices[0] ?? 'option';
    }

    // For text fields, infer a sensible example from the validator regex pattern
    const validators: any[] = element.validators ?? [];
    for (const validator of validators) {
        if (!validator.regex) continue;
        if (validator.regex.includes('/(?:[0-9]|[12]')) return '10.0.0.0/24';  // CIDR
        if (validator.regex.includes('{3}(?:25[0-5]')) return '192.168.1.1'; // IPv4
        if (validator.regex.includes('@')) return 'user@example.com';
    }

    return 'value';
}