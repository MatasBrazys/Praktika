// src/components/admin/FieldEditor/validatorPresets.ts
// Regex presets for common network and contact field formats.
// Auto-applied when a matching inputType is selected in BasicTab.

export const VALIDATOR_PRESETS: Record<string, { regex: string; text: string }> = {
    ipv4: { regex: '^(?:(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)$', text: 'Enter valid IPv4 (e.g., 192.168.1.1)' },
    cidr: { regex: '^(?:(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)/(?:[0-9]|[12]\\d|3[0-2])$', text: 'Enter valid CIDR (e.g., 10.0.0.0/24)' },
    mac: { regex: '^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$', text: 'Enter valid MAC (e.g., AA:BB:CC:DD:EE:FF)' },
    email: { regex: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$', text: 'Enter valid email address' },
    phone: { regex: '^\\+?[1-9]\\d{1,14}$', text: 'Enter phone with country code (e.g., +37061234567)' },
    number: { regex: '^-?\\d+(\\.\\d+)?$', text: 'Enter valid number (e.g., 42 or 3.14)' },
    date: { regex: '^\\d{4}-\\d{2}-\\d{2}$', text: 'Enter date in YYYY-MM-DD format' },
    abbrev3: { regex: '^[A-Z]{3}$', text: 'Enter exactly 3 capital letters (e.g., ABC)' },
};

// All auto-preset regex strings — used to distinguish auto vs manually added validators
export const AUTO_PRESET_REGEXES = Object.values(VALIDATOR_PRESETS).map(p => p.regex);