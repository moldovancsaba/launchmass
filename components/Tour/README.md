# Tour engine

Generic, content-free onboarding-tour engine: a dimmed spotlight overlay + anchored
step tooltip, driven by a plain array of step definitions. No new npm dependency; no
tour-specific content lives here (see `lib/tours/*.js` for actual step content).

## Usage

```jsx
import { TourProvider, useTourContext } from '../components/Tour';
import { adminTourSteps } from '../lib/tours/adminTourSteps';

function AdminPage() {
  return (
    <TourProvider steps={adminTourSteps}>
      {/* page content, including any element bearing a matching data-tour attribute */}
    </TourProvider>
  );
}
```

## The `data-tour` contract

Each step targets an element via `data-tour="<step.id>"` — never a CSS class or DOM
structure selector, so an unrelated markup refactor elsewhere can't silently break a
tour. Add the attribute directly to the real interactive element the step describes:

```jsx
<button data-tour="add-card-button" onClick={onAddCard}>+ Add Card</button>
```

## Step shape

```ts
type TourStep = { id: string; title: string; body: string };
```

## Starting / replaying a tour

`useTourContext()` returns `null` when no `<TourProvider>` is an ancestor — components
like `Header`'s "❓ How this works" replay entry check for this to decide whether to
render at all:

```jsx
const tour = useTourContext();
if (!tour) return null;
// tour.start() replays from step 1 regardless of prior dismissal state.
```

Auto-start-once-per-browser and the replay-entry wiring live in `hooks/useTourAutoStart.js`
and `lib/tourStorage.js`, not here — this engine only knows how to run a tour once
`start()` is called, not when that should happen automatically.
