# SynchBoard - Real-time Collaborative Workspace

SynchBoard is a full-stack MERN application that provides a real-time, drag-and-drop Kanban board for personal and team task management.

## Prerequisites
Before you begin, ensure you have installed:
*   [Node.js](https://nodejs.org/) (v16 or higher)
*   [Git](https://git-scm.com/)
*   A MongoDB Atlas Account (or a local MongoDB instance)

---

## 🛠️ How to Run the Project Locally

To run the full-stack application, you need to start both the Backend (Server) and Frontend (Client) at the same time.

### 1. Clone the repository
```bash
git clone https://github.com/thisal-wtc/SynchBoardfinal-.git
cd SynchBoardfinal-
```

### 2. Setup the Backend (Server)
1. Open a terminal and navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Install backend dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `backend` folder and add the following variables:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string_here
   JWT_SECRET=your_super_secret_key_here
   FRONTEND_URL=http://localhost:5173
   ```
4. Start the backend server:
   ```bash
   npm run dev
   ```
   *You should see a message saying "Server running on port 5000" and "MongoDB Connected".*

### 3. Setup the Frontend (Client)
1. Open a **new, separate terminal** and navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install frontend dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `frontend` folder and add the following variable:
   ```env
   VITE_API_URL=http://localhost:5000
   ```
4. Start the frontend development server:
   ```bash
   npm run dev
   ```
   *The application will now be running on `http://localhost:5173`.*

---

## 🚀 Deployment Links
*   **Live App URL:** https://synch-boardfinal.vercel.app/
*   **Repository:** https://github.com/thisal-wtc/SynchBoardfinal-
