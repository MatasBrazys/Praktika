// src/pages/admin/FormBuilder/hooks/useFormFields.ts
// Field management state and handlers for the active form page.

import type { Page, FieldConfig } from '../../../../types/form-builder.types';

type SetPages = React.Dispatch<React.SetStateAction<Page[]>>;

export function useFormFields(activePageId: string, setPages: SetPages) {

  // Adds a new field if it's new, replaces it if it already exists on the active page
  const saveField = (updated: FieldConfig) => {
    setPages(prev => prev.map(page => {
      if (page.id !== activePageId) return page;
      const exists = page.fields.some(f => f.id === updated.id);
      return {
        ...page,
        fields: exists
          ? page.fields.map(f => f.id === updated.id ? updated : f)
          : [...page.fields, updated],
      };
    }));
  };

  const deleteField = (fieldId: string) => {
    setPages(prev => prev.map(page =>
      page.id !== activePageId
        ? page
        : { ...page, fields: page.fields.filter(f => f.id !== fieldId) }
    ));
  };

  // Swaps a field with its neighbour in the fields array
  const moveField = (fields: FieldConfig[], index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= fields.length) return;

    const reordered = [...fields];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];

    setPages(prev => prev.map(page =>
      page.id !== activePageId ? page : { ...page, fields: reordered }
    ));
  };

  // Builds a blank field config to open in FieldEditor
  const buildNewField = (existingFieldCount: number): FieldConfig => ({
    id:         `field_${Date.now()}`,
    name:       `field_${existingFieldCount + 1}`,
    title:      'New Field',
    type:       'text',
    isRequired: false,
  });

  return { saveField, deleteField, moveField, buildNewField };
}