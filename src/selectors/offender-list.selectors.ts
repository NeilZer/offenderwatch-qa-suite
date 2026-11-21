/** Offender roster: search, table, row actions, pager (FR-01, FR-02, FR-05). See ./index.ts for conventions. */
export const offenderListSelectors = Object.freeze({
  panel: 'section.list-panel',
  searchInput: 'input.search',
  addButton: { role: 'button' as const, name: '+ Add Offender' },
  rows: 'table.grid:not(.trail-grid) tbody tr',
  emptyRow: 'td.empty',
  cells: 'td',
  /** Column order in the roster table. */
  columns: { name: 0, nationalId: 1, dateOfBirth: 2, risk: 3, status: 4 },
  editButton: { role: 'button' as const, name: 'Edit' },
  deleteButton: { role: 'button' as const, name: 'Delete' },
  selectedRow: 'tr.selected',
  pagerText: '.pager span',
  prevButton: { role: 'button' as const, name: '‹ Prev' },
  nextButton: { role: 'button' as const, name: 'Next ›' },
  /** "Page 2 of 3 (11 results)" */
  pagerPattern: /Page\s+(\d+)\s+of\s+(\d+)\s+\((\d+)\s+results\)/,
});
