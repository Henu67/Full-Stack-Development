# CollabBoard — Kanban UI

A drag-and-drop Kanban board built with **React + TypeScript + Vite**, styled to look
like a real whiteboard covered in pushpinned sticky notes. This is the Session 1
front-end deliverable — all task data lives in React state and `localStorage`
(no backend yet).

## Getting started

```bash
npm install
npm run dev
```

Then open the printed local URL (usually `http://localhost:5173`).

## Libraries used (and why)

| Library | Purpose |
|---|---|
| [`@dnd-kit/core`](https://dndkit.com/) | Drag-and-drop for the cards. Chosen over the native HTML5 DnD API because it has proper pointer-sensor support, works well on touch, and gives full control over drop validation. |
| [`@dnd-kit/utilities`](https://dndkit.com/) | Small CSS transform helpers used alongside `@dnd-kit/core`. |
| [`framer-motion`](https://www.framer.com/motion/) | Animations for the Add/Edit modal, delete-confirm dialog, and button micro-interactions. |
| [`lucide-react`](https://lucide.dev/) | Icon set (edit pencil, trash, plus, close, pin). |
| [`react-hot-toast`](https://react-hot-toast.com/) | Toast notifications (task pinned/updated/moved, and the "must pass through In Progress" warning). |
| [`uuid`](https://www.npmjs.com/package/uuid) | Generates task IDs. |

No CSS framework — all styling is hand-written in `src/styles.css` and
`src/index.css` to get the sticky-note / whiteboard look exactly right.

## How it works

### Board rules

- **Columns**: To Do → In Progress → Done.
- **Adding a task**: "Add task" opens a note-styled modal. New tasks always start in **To Do**.
- **Editing**: only allowed while a task is in **To Do** — the pencil icon only appears there on hover.
- **Deleting**: allowed in **To Do** or **Done**, but **not while In Progress** (an in-progress card shows no edit/delete icons at all).
- **Moving cards**: drag a card and drop it in another column.
  - Only **adjacent** moves are allowed: `To Do ↔ In Progress`, `In Progress ↔ Done`.
  - Dragging straight from **To Do to Done is blocked** — the column glows red, the card snaps back, and a toast explains why. A card must pass through **In Progress** first.
  - **Done is terminal**: once a card is Done it can't move back to In Progress or To Do. Done cards aren't even draggable — no grab cursor, no pickup.

### Data & persistence

- `src/hooks/useTasks.ts` holds all task state and every CRUD operation
  (`addTask`, `updateTask`, `deleteTask`, `moveTask`), each enforcing the rules above.
- Tasks are persisted to `localStorage` on every change, so a refresh doesn't lose your board.
- Swap this hook out for real API calls later without touching any component — that's the intended seam for the Session 2 backend work.

### Project structure

```
src/
  types.ts              Task/column types + the business rules (edit/delete/move validity)
  hooks/useTasks.ts      CRUD + localStorage persistence
  utils/noteStyle.ts     Deterministic "randomness" for note tilt/pin position
  components/
    Board.tsx            Top-level layout, DndContext, toasts, modal orchestration
    Column.tsx            A single droppable column
    TaskCard.tsx           A draggable sticky note in a column
    NoteContent.tsx        Shared visual content (pin, actions, text) for card + drag ghost
    DragGhost.tsx           The floating copy shown while dragging (via DragOverlay)
    TaskModal.tsx           Add/Edit form
    ConfirmDialog.tsx       Delete confirmation
```

## Known limitations (Session 1 scope)

- No backend, auth, or real-time sync yet — coming in later sessions per the project brief.
- No automated tests yet (Jest + RTL planned for a later session).
- Data is per-browser (`localStorage`), not shared between teammates yet.
