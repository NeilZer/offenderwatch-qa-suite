/** Add / Edit offender modal (FR-03, FR-04). See ./index.ts for conventions. */
export const offenderFormSelectors = Object.freeze({
  modal: '.modal',
  title: '.modal h2',
  /** Fields are located by their visible label text. */
  fieldLabels: {
    firstName: 'First name',
    lastName: 'Last name',
    nationalId: 'National ID',
    dateOfBirth: 'Date of birth',
    riskLevel: 'Risk level',
    status: 'Status',
  },
  createButton: { role: 'button' as const, name: 'Create' },
  saveButton: { role: 'button' as const, name: 'Save' },
  cancelButton: { role: 'button' as const, name: 'Cancel' },
});
