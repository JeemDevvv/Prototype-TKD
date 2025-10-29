# Arise Taekwonders Web System

## Features
- Public homepage with group/coach photos, events
- Player stats search (by NCC Reference #)
- Admin login and dashboard (add/edit/delete/export players)
- Player profile public view

## Stack
- Frontend: HTML, CSS, JS
- Backend: Node.js, Express
- Database: MongoDB (Mongoose)

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Configure MongoDB:**
   - Create a `.env` file in `/backend` with:
     ```env
     MONGODB_URI=your_mongodb_connection_string
     SESSION_SECRET=your_secret
     ```
3. **Run the backend:**
   ```bash
   npm run dev
   ```
   (Server runs on http://localhost:3000)

4. **Open the frontend:**
   - Open `frontend/pages/index.html` in your browser.
   - Or serve with a static server.

## Folder Structure
- `backend/` — Express API, models, routes
- `frontend/` — HTML, CSS, JS, images

## Development
- Extend backend routes/controllers for more features
- Update frontend pages/styles as needed 