// Functional: Step content for the admin onboarding tour (issue #28). Purely data — the
// generic engine in components/Tour knows nothing about admin concepts; it just matches
// each step.id against a data-tour attribute somewhere in the current page.
export const adminTourSteps = [
  {
    id: 'nav-menu-button',
    title: 'Navigation',
    body: 'This menu gets you to Admin, Organizations, and User management.',
  },
  {
    id: 'org-selector',
    title: 'Organization selector',
    body: "Switch which organization's cards you're managing.",
  },
  {
    id: 'add-card-button',
    title: 'Add Card',
    body: 'Creates a new card in the currently selected organization.',
  },
  {
    id: 'card-drag-handle',
    title: 'Reorder',
    body: 'Drag to reorder — the public grid reflects this order instantly.',
  },
  {
    id: 'card-edit-delete',
    title: 'Edit & Delete',
    body: "Edit changes title, link, description, background, and tags. Delete is immediate — there's no undo yet.",
  },
  {
    id: 'nav-organizations',
    title: 'Organizations',
    body: 'Create and manage organizations here.',
  },
  {
    id: 'nav-manage-users',
    title: 'Manage Users',
    body: 'Approve pending users and change roles here.',
  },
];
