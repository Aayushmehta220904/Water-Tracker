# 💧 Water Tracker

A simple web-based water intake tracker that helps users record their daily water consumption, manage personal hydration goals, and view weekly and monthly intake statistics.

## Overview

Water Tracker is a frontend project built with **HTML, CSS, and JavaScript**, using **Firebase Authentication** and **Cloud Firestore** for user and intake data storage.

The app supports multiple users, custom daily goals, optional password protection, streak tracking, and visual progress statistics.

## Features

- Add and manage multiple users
- Store user details such as:
  - name
  - date of birth
  - daily water goal
  - optional password
- Select a user and track daily water intake
- Quick-add buttons for common intake amounts
- Add custom water intake values
- Automatic daily progress calculation
- Streak tracking based on goal completion
- Best streak tracking
- Reset today's intake
- Delete all intake data for a selected user
- Weekly and monthly average intake statistics
- Bar and line chart visualization for progress
- Responsive UI with a clean and colorful design

## Tech Stack

- **HTML5**
- **CSS3**
- **JavaScript (Vanilla JS)**
- **Firebase Authentication**
- **Cloud Firestore**
- **Chart.js**
- **SweetAlert2**

## Project Structure

```bash
Water-Tracker-main/
│
├── index.html              # Main water tracking page
├── users.html              # User management page
├── stats.html              # Statistics dashboard
├── style.css               # Styling for all pages
├── script.js               # Logic for the main tracker page
├── users.js                # User management logic
├── stats.js                # Weekly/monthly stats logic
└── firebase-config.js      # Firebase configuration and initialization
```

## How It Works

### 1. User Management
Users can be added with a name, date of birth, hydration goal, and optional password. Each user is stored in Firestore.

### 2. Daily Water Tracking
On the main page, the selected user can add water intake using preset values or a custom amount. The total intake is stored by date.

### 3. Goal and Streak System
The app compares daily intake with the user's goal and updates:
- current streak
- best streak
- daily goal status

### 4. Statistics Dashboard
The stats page shows:
- weekly average intake
- monthly average intake
- graphical intake trends using Chart.js

## Firebase Collections

### `users`
Stores user information:
- `name`
- `dob`
- `goalMl`
- `password`
- `streak`
- `bestStreak`
- `createdAt`

### `intakes`
Stores daily intake records:
- `userId`
- `dateKey`
- `ml`
- `metGoal`
- `updatedAt`

## Setup Instructions

### 1. Clone the repository
```bash
git clone <your-repo-link>
cd Water-Tracker-main
```

### 2. Create a Firebase project
- Go to Firebase Console
- Create a new project
- Enable **Authentication**
- Enable **Anonymous Sign-In**
- Create a **Cloud Firestore** database

### 3. Update Firebase configuration
Replace the values inside `firebase-config.js` with your own Firebase project credentials.

### 4. Run the project
Since this is a static frontend project, you can open `users.html` directly in a browser, or run it using a local server.

Example with VS Code Live Server:
- Install the Live Server extension
- Right-click `users.html`
- Select **Open with Live Server**

## Usage

1. Open the app
2. Add a new user
3. Select the user
4. Add daily water intake using quick-add or custom input
5. View progress and streak on the home page
6. Open the stats page to see weekly and monthly analytics

## Screens Included in the Project

- **Users Page** – add/select/manage users
- **Home Page** – track daily intake
- **Stats Page** – visualize intake averages and trends

## Possible Improvements

- User login with email/password instead of storing passwords directly
- Better data validation and error handling
- Edit intake history by date
- Notifications or reminders to drink water
- Dark mode support
- Export reports for users
- Mobile app version

## Notes

- The current version uses optional password protection stored in the database for simple user separation.
- Firebase Anonymous Authentication is used to ensure database access.
- The project is lightweight and suitable for beginner-to-intermediate frontend/Firebase practice.

## Author

**Aayush Mehta**

