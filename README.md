# My Drive - Cloud Storage Application

A web application inspired by Google Drive, allowing users to register, log in, create nested folders, upload images, search images by name, and manage their content with delete functionality. Built with a modern full-stack tech stack, this project demonstrates secure user authentication, cloud storage integration, and a responsive UI.

## Features

- **User Authentication**: Signup and login with JWT-based authentication.
- **Nested Folders**: Create folders within folders, similar to Google Drive’s hierarchy.
- **Image Upload**: Upload images to specific folders via form or drag-and-drop, stored in AWS S3.
- **Search**: Search images by name across all user-owned content.
- **User-Specific Access**: Users can only see and manage their own folders and images.
- **Delete Functionality**: Delete empty folders and individual images (including from S3).
- **Responsive UI**: Clean, Google Drive-like interface with loaders for asynchronous operations.
- **Navigation**: Breadcrumb navigation for folder hierarchy and links between signup/login pages.

## Tech Stack

### Backend

- **Node.js**: Runtime environment.
- **Express**: Web framework for API endpoints.
- **MongoDB**: NoSQL database (via MongoDB Atlas) for storing users, folders, and image metadata.
- **AWS SDK v3**: Modular S3 client for image storage (`@aws-sdk/client-s3`).
- **JWT**: JSON Web Tokens for authentication (`jsonwebtoken`).
- **Bcrypt**: Password hashing (`bcrypt`).
- **Multer**: Middleware for handling multipart/form-data (`multer`).

### Frontend

- **React 18**: Frontend library for building the UI (`create-react-app`).
- **React Router**: Navigation and protected routes (`react-router-dom`).
- **Axios**: HTTP client for API requests (`axios`).
- **Tailwind CSS**: Utility-first CSS framework for styling.
- **Heroicons**: Icons for folder, image, and UI elements (`@heroicons/react`).

## Prerequisites

- **Node.js**: v14 or higher.
- **npm**: v6 or higher (comes with Node.js).
- **MongoDB Atlas**: A free cluster for database hosting.
- **AWS Account**: For S3 bucket creation and credentials.

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/my-drive.git
cd my-drive
```

#### 2. Backend Setup

1. Navigate to the backend directory:

```bash
cd backend
```

2. Install dependencies:

```bash
npm install
```

3. Create a .env file in the backend directory with the following:

```bash
MONGODB_URI=<your-mongodb-atlas-connection-string>
JWT_SECRET=<your-secret-key>
AWS_ACCESS_KEY_ID=<your-aws-access-key>
AWS_SECRET_ACCESS_KEY=<your-aws-secret-key>
AWS_REGION=<your-aws-region>  # e.g., us-east-1
AWS_BUCKET_NAME=<your-s3-bucket-name>
```

Replace placeholders with your actual values.
Create an S3 bucket in AWS and note its name. 4. Start the backend server:

```bash
node server.js
```

The server will run on http://localhost:5000.

### 3. Frontend Setup

Navigate to the frontend directory:

```bash
cd ../frontend
```

Install dependencies:

```bash
npm install
```

Update axios base URL in src/App.js (optional, defaults to localhost):

```javascript
axios.defaults.baseURL = "http://localhost:5000"; // For local development
```

Start the frontend:

```bash
npm start
```

The app will run on http://localhost:3000.

### 4. Verify Setup

Open http://localhost:3000/signup in your browser.
Sign up with a username, password, and email.
Log in and explore the dashboard.
