# Personal Finance Dashboard & Budget Planner

A full-stack personal finance management application for tracking accounts, income, expenses, transfers, budgets, savings goals, and recurring transactions through a centralized dashboard.

The application provides authenticated, user-specific financial management with a React frontend, Express REST API, PostgreSQL database, and Prisma ORM.

## Features

### Authentication

- User registration and login
- Password hashing
- Signed access-token authentication
- Protected API routes
- User-specific data isolation
- Authentication rate limiting

### Accounts

- Create and manage financial accounts
- Supported account types:
  - Bank
  - Cash
  - Credit Card
  - Wallet
  - Investment
  - Other
- Multi-currency account support
- Archive and restore accounts
- Protection against unsafe account modifications when financial activity already exists

### Transactions

- Record income and expenses
- Categorize transactions
- Associate transactions with accounts
- Edit and delete transactions
- Display transaction history
- Currency-aware transaction handling

### Transfers

- Transfer money between accounts
- Prevent transfers to the same account
- Validate account ownership
- Enforce compatible currencies
- Maintain transfer history

### Budgets

- Create category-based budgets
- Define budget periods
- Track spending against budget limits
- View remaining budget amounts
- Edit and delete budgets

### Savings Goals

- Create financial savings goals
- Set target amounts and target dates
- Allocate income transactions toward goals
- Support partial income allocation
- Allocate one income transaction across multiple goals
- Prevent allocations beyond available income
- Prevent contributions beyond the remaining goal amount
- Track goal progress and completion percentage
- Automatically show completed goals as achieved

### Recurring Transactions

- Create recurring income and expenses
- Supported frequencies:
  - Daily
  - Weekly
  - Monthly
  - Yearly
- Background scheduler automatically creates due transactions
- Prevents duplicate recurring transaction occurrences
- Supports start dates, end dates, and activation state

### Dashboard

Monthly financial overview including:

- Total income
- Total expenses
- Net savings
- Expense breakdown by category
- Account overview
- Recent transactions
- Recent transfers

## Tech Stack

### Frontend

- React 19
- React Router
- Vite
- Tailwind CSS
- Lucide React

### Backend

- Node.js
- Express.js
- Prisma ORM
- PostgreSQL
- Node Cron

### Security

- Password hashing using Node.js crypto
- Signed access tokens
- Authentication and authorization middleware
- User ownership validation
- Helmet security headers
- CORS configuration
- API and authentication rate limiting
- Environment variable validation
- Generic production error responses
- Request body size limits

### Testing

- Vitest
- Supertest
- Separate PostgreSQL test database
- Automated API integration tests

The backend test suite covers authentication, accounts, categories, transactions, transfers, budgets, savings goals, recurring transactions, dashboard behavior, rate limiting, environment validation, and error handling.

## Project Structure

```text
personal-finance-dashboard/
├── client/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── lib/
│   │   ├── pages/
│   │   ├── services/
│   │   └── utils/
│   ├── package.json
│   └── vite.config.js
│
├── server/
│   ├── prisma/
│   │   ├── migrations/
│   │   ├── schema.prisma
│   │   └── seed.js
│   ├── src/
│   │   ├── lib/
│   │   ├── middleware/
│   │   ├── routes/
│   │   └── services/
│   ├── tests/
│   ├── package.json
│   └── server.js
│
├── .gitignore
└── README.md
```

## Prerequisites

Install the following before running the project:

- Node.js
- npm
- PostgreSQL

## Environment Variables

Create a `.env` file inside the `server` directory.

Use `server/.env.example` as the template.

Required variables include:

```env
DATABASE_URL=your_postgresql_connection_string
AUTH_TOKEN_SECRET=your_secure_authentication_secret
FRONTEND_ORIGIN=http://localhost:5173
```

Do not commit `.env` or `.env.test` files.

## Installation

Clone the repository and install frontend and backend dependencies separately.

### Frontend

```bash
cd client
npm install
```

### Backend

```bash
cd server
npm install
```

## Database Setup

Create a PostgreSQL database and configure `DATABASE_URL` in `server/.env`.

Then run the Prisma migrations from the `server` directory:

```bash
npx prisma migrate deploy
```

To seed the database:

```bash
npm run db:seed
```

## Running the Application

### Start the Backend

From the `server` directory:

```bash
npm run dev
```

The backend runs on:

```text
http://localhost:3000
```

### Start the Frontend

From the `client` directory:

```bash
npm run dev
```

Vite will display the frontend development URL, normally:

```text
http://localhost:5173
```

## Running Tests

The automated backend tests use a separate PostgreSQL test database.

Configure `server/.env.test`, then run:

```bash
cd server
npm test
```

The test command runs Vitest using the test environment configuration.

For watch mode:

```bash
npm run test:watch
```

## Additional Backend Commands

Validate the Prisma schema:

```bash
npm run prisma:validate
```

Format the Prisma schema:

```bash
npm run prisma:format
```

Start the backend without watch mode:

```bash
npm start
```

## API Overview

Main API groups:

```text
/api/auth
/api/accounts
/api/categories
/api/transactions
/api/transfers
/api/dashboard
/api/budgets
/api/savings-goals
/api/recurring
```

Protected endpoints require an access token in the Authorization header:

```text
Authorization: Bearer <access-token>
```

## Data Integrity

The backend includes protections for financial consistency, including:

- Ownership validation for related resources
- UUID and input validation
- Currency compatibility checks
- Transactional savings-goal contributions
- Prevention of over-allocation of income
- Protection against concurrent savings allocation conflicts
- Recurring transaction duplicate prevention
- Restrictions on unsafe account modifications
- Database constraints and foreign keys

## Deployment

The planned production architecture uses AWS:

- Amazon EC2 — Node.js/Express backend
- Amazon RDS for PostgreSQL — relational database
- IAM — AWS access control
- Security Groups — network access control
- Amazon CloudWatch — basic application and server logging

The React frontend deployment will be finalized as part of the deployment phase.

## Status

Core application development is complete.

Completed:

- Backend API
- PostgreSQL/Prisma database
- Authentication and authorization
- Frontend application
- Responsive UI
- Automated API testing
- Security and production-readiness audit
- Project cleanup

Next:

- AWS deployment

## License

This project is intended for educational and portfolio purposes.