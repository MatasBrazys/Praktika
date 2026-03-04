// src/components/public/NetworkImporter/utils/cellValidator.ts
// Validates a single CSV cell value against the field's SurveyJS templateElement definition.

// Result of validating one cell in the import preview table
export interface CellResult {
    raw: string;
    valid: boolean;
    error?: string;
    converted?: any;   // final value passed to SurveyJS (e.g. boolean true/false, matched choice string)
}

// Returns the choice values for dropdown, radiogroup, or checkbox fields
export function getChoices(templateElement: any): string[] {
    if (!templateElement?.choices) return [];
    return templateElement.choices.map((choice: any) =>
        typeof choice === 'string' ? choice : (choice.value ?? choice.text ?? String(choice))
    );
}

// Validates a raw string cell value against the field type and required flag.
// Returns the validated (and possibly converted) value on success.
export function validateCell(raw: string, templateElement: any, required: boolean): CellResult {
    const value = raw?.trim() ?? '';

    if (!value) {
        if (required) return { raw, valid: false, error: 'Required' };
        return { raw, valid: true, converted: value };
    }

    const fieldType = templateElement?.type ?? 'text';

    switch (fieldType) {
        case 'boolean': return validateBoolean(raw, value);
        case 'dropdown':
        case 'radiogroup': return validateSingleChoice(raw, value, templateElement);
        case 'checkbox': return validateMultiChoice(raw, value, templateElement);
        default: return validateText(raw, value, templateElement);
    }
}

// ── Private validators ────────────────────────────────────────────────────────

// Accepts: yes, no, true, false, 1, 0
function validateBoolean(raw: string, value: string): CellResult {
    const lower = value.toLowerCase();
    const accepted = ['yes', 'no', 'true', 'false', '1', '0'];

    if (!accepted.includes(lower)) {
        return { raw, valid: false, error: 'Use: yes / no' };
    }

    const converted = ['yes', 'true', '1'].includes(lower);
    return { raw, valid: true, converted };
}

// Matches value against field choices (case-insensitive), returns exact case from definition
function validateSingleChoice(raw: string, value: string, templateElement: any): CellResult {
    const choices = getChoices(templateElement);
    const match = choices.find(c => c.toLowerCase() === value.toLowerCase());

    if (!match) {
        return { raw, valid: false, error: `Options: ${choices.join(' / ')}` };
    }

    return { raw, valid: true, converted: match };
}

// Accepts pipe-separated values, each matched against field choices
function validateMultiChoice(raw: string, value: string, templateElement: any): CellResult {
    const choices = getChoices(templateElement);

    if (!choices.length) {
        return { raw, valid: true, converted: value.split('|').map(p => p.trim()) };
    }

    const parts = value.split('|').map(p => p.trim());
    const invalid = parts.filter(p => !choices.find(c => c.toLowerCase() === p.toLowerCase()));

    if (invalid.length) {
        return { raw, valid: false, error: `Unknown: ${invalid.join(', ')}` };
    }

    const converted = parts.map(p => choices.find(c => c.toLowerCase() === p.toLowerCase()) ?? p);
    return { raw, valid: true, converted };
}

// Validates text/comment fields against their regex validators
function validateText(raw: string, value: string, templateElement: any): CellResult {
    const validators: any[] = templateElement?.validators ?? [];

    for (const validator of validators) {
        if (!validator.regex) continue;
        try {
            if (!new RegExp(validator.regex).test(value)) {
                return { raw, valid: false, error: validator.text ?? 'Invalid format' };
            }
        } catch {
            // Skip malformed regex patterns
        }
    }

    return { raw, valid: true, converted: value };
}