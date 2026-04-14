// src/components/public/BulkkImporter/utils/csvParser.ts
// CSV parsing utilities for the bulk import feature.

import type { BulkImportField } from '../../../../types/form-builder.types';

// Parses a raw CSV or plain-text string into a header row and data rows.
// Handles quoted fields that contain commas.
export function parseCSV(text: string): { headers: string[]; rows: string[][] } {
    const lines = text.trim().split(/\r?\n/).filter(line => line.trim());
    if (!lines.length) return { headers: [], rows: [] };

    const firstRow = parseCsvRow(lines[0]).map(cell => cell.trim());
    const remainingRows = lines.slice(1).map(parseCsvRow);

    return { headers: firstRow, rows: remainingRows };
}

// Determines which column index maps to which field name.
// If the first row looks like a header (names match configured fields), maps by name.
// Otherwise falls back to positional mapping (col 0 = first field, col 1 = second, etc.).
export function resolveColumnMap(
    parsedHeaders: string[],
    bulkFields: BulkImportField[],
): { columnMap: Record<string, number>; hasHeader: boolean } {
    const configuredNames = bulkFields.map(f => f.name.toLowerCase());
    const firstRowLower = parsedHeaders.map(h => h.toLowerCase());

    const matchCount = firstRowLower.filter(h => configuredNames.includes(h)).length;
    const hasHeader = matchCount >= Math.ceil(configuredNames.length / 2);

    const columnMap: Record<string, number> = {};

    if (hasHeader) {
        bulkFields.forEach(field => {
            const index = firstRowLower.indexOf(field.name.toLowerCase());
            if (index >= 0) columnMap[field.name] = index;
        });
    } else {
        // Positional: first configured field → column 0, second → column 1, etc.
        bulkFields.forEach((field, index) => { columnMap[field.name] = index; });
    }

    return { columnMap, hasHeader };
}

// ── Private helpers ───────────────────────────────────────────────────────────

// Splits a single CSV line into cells, respecting double-quoted fields
function parseCsvRow(line: string): string[] {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
        if (char === '"') { inQuotes = !inQuotes; continue; }
        if (char === ',' && !inQuotes) { cells.push(current); current = ''; continue; }
        current += char;
    }

    cells.push(current);
    return cells;
}