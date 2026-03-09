// src/pages/admin/FormBuilder/hooks/useFormPages.ts
// Manages pages state for the form builder.
// FIX: resetPages now correctly updates activePageId to the first page of the loaded form,
//      preventing a stale ID mismatch when editing an existing form.

import { useState, useCallback } from 'react'
import type { Page } from '../../../../types/form-builder.types'

const makeDefaultPage = (): Page => ({
  id:     'page_1',
  name:   'page1',
  title:  'Page 1',
  fields: [],
})

export function useFormPages() {
  const [pages,         setPages]         = useState<Page[]>([makeDefaultPage()])
  const [activePageId,  setActivePageId]  = useState<string>('page_1')

  // Derived: currently active page (falls back to first page if ID is stale)
  const activePage = pages.find(p => p.id === activePageId) ?? pages[0]

  // Called when loading an existing form — replaces all pages AND resets the
  // active tab to the first loaded page so no stale ID remains from the default state.
  const resetPages = useCallback((loaded: Page[]) => {
    const safePages = loaded.length ? loaded : [makeDefaultPage()]
    setPages(safePages)
    setActivePageId(safePages[0].id)   // ← THE FIX: sync active tab to loaded data
  }, [])

  const addPage = useCallback(() => {
    const newId    = `page_${Date.now()}`
    const newIndex = pages.length + 1
    const newPage: Page = {
      id:     newId,
      name:   `page${newIndex}`,
      title:  `Page ${newIndex}`,
      fields: [],
    }
    setPages(prev => [...prev, newPage])
    setActivePageId(newId)
  }, [pages.length])

  const deletePage = useCallback((pageId: string) => {
    setPages(prev => {
      if (prev.length <= 1) return prev   // always keep at least one page
      const next = prev.filter(p => p.id !== pageId)
      // If we deleted the active page, switch to the last remaining page
      setActivePageId(id => id === pageId ? next[next.length - 1].id : id)
      return next
    })
  }, [])

  const updatePageTitle = useCallback((pageId: string, title: string) => {
    setPages(prev => prev.map(p => p.id === pageId ? { ...p, title } : p))
  }, [])

  return {
    pages,
    setPages,
    activePage,
    activePageId,
    setActivePageId,
    addPage,
    deletePage,
    updatePageTitle,
    resetPages,
  }
}