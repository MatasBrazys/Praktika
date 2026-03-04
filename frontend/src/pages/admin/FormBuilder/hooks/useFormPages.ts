// src/pages/admin/FormBuilder/hooks/useFormPages.ts
// Page management state and handlers for multi-page forms.

import { useState } from 'react';
import { useToast } from '../../../../contexts/ToastContext';
import type { Page } from '../../../../types/form-builder.types';

const DEFAULT_PAGE: Page = { id: 'page_1', name: 'page1', title: 'Page 1', fields: [] };

export function useFormPages(initialPages: Page[] = [DEFAULT_PAGE]) {
  const [pages,        setPages]        = useState<Page[]>(initialPages);
  const [activePageId, setActivePageId] = useState<string>(initialPages[0].id);
  const { toast } = useToast();

  const activePage = pages.find(p => p.id === activePageId) || pages[0];

  // Adds a new blank page and switches to it
  const addPage = () => {
    const newId = `page_${Date.now()}`;
    setPages(prev => [...prev, { id: newId, name: `page${prev.length + 1}`, title: `Page ${prev.length + 1}`, fields: [] }]);
    setActivePageId(newId);
  };

  // Deletes a page and switches to the first remaining page
  const deletePage = (pageId: string) => {
    if (pages.length === 1) { toast.warning('Cannot delete', 'At least one page is required.'); return; }
    if (!confirm('Delete this page and all its fields?')) return;
    const remaining = pages.filter(p => p.id !== pageId);
    setPages(remaining);
    if (activePageId === pageId) setActivePageId(remaining[0].id);
  };

  const updatePageTitle = (pageId: string, newTitle: string) => {
    setPages(prev => prev.map(p => p.id === pageId ? { ...p, title: newTitle } : p));
  };

  // Replaces all pages at once — used when loading an existing form
  const resetPages = (newPages: Page[]) => {
    setPages(newPages);
    setActivePageId(newPages[0].id);
  };

  return { pages, setPages, activePage, activePageId, setActivePageId, addPage, deletePage, updatePageTitle, resetPages };
}