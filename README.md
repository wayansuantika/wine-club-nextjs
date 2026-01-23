# Wine Club (Next.js)

A Next.js based wine club application using Xendit for payments and MongoDB for data storage.  
Built with TypeScript, Tailwind CSS, and the Next.js App Router.

## What This Is

This project is a wine club web application designed for subscription or membership-based sales.  
It provides a solid starting point for handling user access, payments, and content.

Use this project for:
- Wine club subscriptions
- Member-only pages
- Online checkout using Xendit

## Tech Stack

- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- MongoDB
- Xendit API

## Features

Core functionality includes:
- Public pages (home, product, profile)
- User authentication
- Checkout and payment processing via Xendit
- Membership or subscription logic
- MongoDB models for users, orders, and products

## Getting Started

### Clone the Repository

```bash
git clone https://github.com/wayansuantika/wine-club-nextjs.git
cd wine-club-nextjs
```

### Install Dependencies
```bash
npm install
```

### Environment Setup
Create a .env.local file in the root directory:
```bash
MONGODB_URI=your_mongodb_connection_string
NEXT_PUBLIC_XENDIT_API_KEY=your_xendit_public_key
XENDIT_SECRET_KEY=your_xendit_secret_key
```

### Run Development Server
```bash
npm run dev
```

### Open the app at:
```arduino
http://localhost:3000
```
### Build for Production
```bash
npm run build
npm start
```
The project can be deployed easily on platforms like Vercel.

## Project Structure
```vbnet
/app        Next.js routes and layouts
/lib        Database connections and helpers
/public     Static assets
/types      Shared TypeScript types
```

### Notes
- Xendit payments will not work without valid API credentials.
- MongoDB must be accessible before starting the app.
- Tailwind CSS is preconfigured.

### Contributing
Fork the repository, create a feature branch, and submit a pull request.

License
MIT License
