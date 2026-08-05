export const LAUNCHMASS_TOUR_ID = 'launchmass-welcome';

// Functional: One step per hamburger-menu item, in menu order
// Strategic: launchmass has a single flat hamburger menu (no sidebar/sections like
// messmass, no persistent nav like fanmass), so -- same shape as fanmass's single
// tour -- one welcome tour covering the menu is enough. Admin-only items are
// dropped when the visitor isn't authenticated, matching what Header.jsx itself
// already shows/hides.
/**
 * @param {boolean} isAuthenticated
 * @returns {import('../useTourController').TourStepConfig[]}
 */
export function getLaunchmassTourSteps(isAuthenticated) {
  const steps = [
    {
      id: 'home',
      targetSelector: '[data-tour-id="tour-home"]',
      title: 'Home',
      description: 'Jump back to your card launcher from anywhere.',
    },
  ];

  if (isAuthenticated) {
    steps.push(
      {
        id: 'admin',
        targetSelector: '[data-tour-id="tour-admin"]',
        title: 'Admin',
        description: 'Add, edit, and reorder the cards shown on your launcher.',
      },
      {
        id: 'organizations',
        targetSelector: '[data-tour-id="tour-organizations"]',
        title: 'Organizations',
        description: 'Switch between organizations or set which one shows by default.',
      },
      {
        id: 'manage-users',
        targetSelector: '[data-tour-id="tour-manage-users"]',
        title: 'Manage Users',
        description: "Control who has access and what they're allowed to do.",
      }
    );
  } else {
    steps.push({
      id: 'login',
      targetSelector: '[data-tour-id="tour-login"]',
      title: 'Login',
      description: 'Sign in to manage this launcher’s cards and organizations.',
    });
  }

  return steps;
}
