# Synchboard - Team Task Board

![Project Status](https://img.shields.io/badge/Status-In%20Progress-blue?style=flat-square)
![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=flat-square&logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=flat-square&logo=mongodb&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)

Welcome to **Synchboard**! This is a progressively built, collaborative full-stack web application designed for our group project. 

Our goal is to build a real-time, Kanban-style task board (similar to Trello or Jira) where our team can create boards, add tasks, move them seamlessly between columns (To Do / In Progress / Done), and see teammates' changes update live across all connected clients.

---

## Overview & Objectives

We are building this application across five distinct milestones. The project evolves from a static UI into a fully deployed, real-time, and rigorously tested full-stack application.

### Mandatory Technical Requirements

We are strictly adhering to the following tech stack and requirements to ensure a robust application:

- **Frontend:** Built with React (TypeScript + Vite) and organized into reusable components. `@dnd-kit` is used for smooth drag-and-drop interactions.
- **Backend:** RESTful API built with Node.js and Express, following a clean `routes/controllers/models` architecture.
- **Database:** Data persistence via MongoDB using Mongoose as the ODM.
- **Authentication:** Secure user registration, login, and protected routes using JWT.
- **Offline Support:** Client-side persistence (e.g., localStorage) to keep work safe during brief network drops.
- **Concurrency:** Handling concurrent edits gracefully (detecting conflicts rather than silently overwriting data).
- **Testing & CI:** Automated tests on both client (Jest + React Testing Library) and server (Jest + Supertest) running in a Continuous Integration (CI) pipeline (GitHub Actions).
- **Real-Time Sync:** WebSockets via Socket.io to push live updates to all connected users.
- **DevOps:** Containerized with Docker (`docker-compose` for local environments) and deployed to a publicly reachable URL.

---

## Project Milestones

| Milestone | Date | Goal | Deliverables |
| :--- | :--- | :--- | :--- |
| **M1** | 2 Aug | Static Front-End Skeleton | React app scaffolded, UI with mock data, component tree, repo live. |
| **M2** | 9 Aug | Working REST API | Express CRUD API, JWT auth, frontend wired to real endpoints. |
| **M3** | 16 Aug | Persistence & Offline Support | MongoDB/Mongoose integration, schema diagram, client caching. |
| **M4** | 23 Aug | Test Suite & CI | Server/Client tests, GitHub Actions CI pipeline, bug fixes. |
| **M5** | 30 Aug | Real-Time, DevOps & Launch | Socket.io live sync, Docker Compose, deployed app, final demo. |

---

## Group Assignment Task Breakdown (10 Roles)

To ensure smooth collaboration and even workload distribution among our 10-member group, the project has been broken down into 10 clear roles. 

### 1. Project Setup & Architecture Lead
- **Responsibility:** Manage the foundational project setup (Vite, TypeScript Config, ESLint) and streamline the development environment.
- **Key Files:** `package.json`, `vite.config.ts`, `tsconfig.json`, `eslint.config.js`
- **Tasks:** Manage npm dependencies, handle the build process, and support the team with local environment setups.

### 2. Main Board & Layout Controller
- **Responsibility:** Oversee the overall design and layout structure of the main Board.
- **Key Files:** `src/components/Board.tsx`, `src/App.tsx`
- **Tasks:** Render the 3 main columns correctly, set up toast notifications, and manage the core page layout.

### 3. Drag & Drop Specialist (DND Kit)
- **Responsibility:** Control the drag-and-drop user experience.
- **Key Files:** DND Sensors in `src/components/Board.tsx`, `src/components/DragGhost.tsx`
- **Tasks:** Study and optimize `handleDragStart` and `handleDragEnd`. Polish the shadow/ghost element that appears while a task is being dragged.

### 4. Column & List Manager
- **Responsibility:** Manage task rendering and behavior inside individual columns.
- **Key Files:** `src/components/Column.tsx`
- **Tasks:** Implement `@dnd-kit`'s `SortableContext` and `useDroppable` to create reliable drop zones. Design the UI for empty columns.

### 5. Task Card UI/UX Designer
- **Responsibility:** Craft the visual aesthetics and micro-interactions of a single Task Card.
- **Key Files:** `src/components/TaskCard.tsx`, `src/components/NoteContent.tsx`
- **Tasks:** Use Framer Motion for smooth hover effects, implement color coding (yellow, pink, etc.), and ensure clicking a card opens the editing modal seamlessly.

### 6. Modal & Forms Developer
- **Responsibility:** Build the popup interfaces for creating and editing tasks.
- **Key Files:** `src/components/TaskModal.tsx`
- **Tasks:** Implement robust form validation (preventing empty titles/descriptions) and design an intuitive UI for task color selection.

### 7. State Management & Hooks Engineer
- **Responsibility:** Manage the data layer, caching, and state updates.
- **Key Files:** `src/hooks/useTasks.ts`
- **Tasks:** Handle the core tasks array, write logic for adding new tasks, and perfect the `moveTask` function to update state reliably after a drag event.

### 8. Types & Business Logic Analyst
- **Responsibility:** Define TypeScript interfaces and enforce core application rules.
- **Key Files:** `src/types.ts`
- **Tasks:** Enforce logical constraints (e.g., preventing a direct jump from *To Do* to *Done* via `isAdjacentMove`), manage the `canEdit` rules for completed tasks, and maintain clean data structures.

### 9. UI/CSS & Animation Stylist
- **Responsibility:** Maintain the global design system, CSS variables, and responsiveness.
- **Key Files:** `src/index.css`, `src/styles.css`, `src/utils/noteStyle.ts`
- **Tasks:** Polish custom CSS properties, background patterns, and sticky note visuals. Ensure the app is fully responsive and looks great on mobile devices.

### 10. QA, Alerts & Deletion Handler
- **Responsibility:** Safeguard user actions and manage error states.
- **Key Files:** `src/components/ConfirmDialog.tsx`
- **Tasks:** Trigger error toasts for invalid actions, refine the deletion confirmation dialog, and rigorously test the application for edge cases and bugs.

---

## Getting Started Locally (How to run on your laptop)

To run this project on your laptop, follow these exact steps:

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your computer.

### Installation & Setup

1. **Clone the repository:**
   Open your terminal/command prompt and clone the project to your laptop:
   ```bash
   git clone <your-repo-link-here>
   cd Full-Stack-Development
   ```

2. **Run the Frontend (React + Vite):**
   Open a terminal, go into the `frontend` folder, install the required packages, and start the development server.
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   After running these commands, the terminal will show a link (usually `http://localhost:5173`). Open that link in your browser to see the app!

---
*Built by our team for the Full-Stack Workshop.*
