# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a Node.js/Express boilerplate for building production-ready RESTful APIs. It uses MongoDB for persistence, JWT for authentication, and follows a layered MVC architecture with clear separation of concerns.

## Quick Commands

### Development
- `yarn dev` - Start development server with auto-reload (nodemon)
- `yarn start` - Start production server with PM2 process manager

### Testing
- `yarn test` - Run all tests once
- `yarn test:watch` - Run tests in watch mode
- `yarn coverage` - Generate test coverage report
- `yarn test -- --testNamePattern="pattern"` - Run specific test by name
- `yarn test tests/unit` - Run only unit tests
- `yarn test tests/integration` - Run only integration tests

### Code Quality
- `yarn lint` - Check for linting errors (ESLint)
- `yarn lint:fix` - Automatically fix linting errors
- `yarn prettier` - Check code formatting
- `yarn prettier:fix` - Automatically format code

### Docker
- `yarn docker:dev` - Run app in Docker development mode
- `yarn docker:test` - Run tests in Docker
- `yarn docker:prod` - Run app in Docker production mode

## Architecture

The codebase follows a layered MVC pattern with the following structure:

```
src/
├── config/        # Environment config, database setup, roles/permissions
├── models/        # Mongoose schemas with custom plugins (toJSON, paginate)
├── controllers/   # Route handlers - parse requests and call services
├── services/      # Business logic layer - where actual work happens
├── routes/        # API endpoint definitions with middleware chains
├── middlewares/   # Auth, validation, error handling, logging
├── validations/   # Joi schemas for request validation
├── utils/         # Helper classes (ApiError, catchAsync, etc)
├── docs/          # Swagger/OpenAPI documentation
├── app.js         # Express app setup and middleware configuration
└── index.js       # Entry point - starts server and MongoDB connection
```

### Key Patterns

**Error Handling**: Use the `ApiError` utility class to throw errors with status codes. Wrap async controllers with `catchAsync` to automatically forward errors to the error handling middleware.

```javascript
const ApiError = require('../utils/ApiError');
throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
```

**Request Validation**: Joi schemas are defined in `src/validations/` and applied via the `validate` middleware in routes.

**Authentication**: JWT-based via Passport middleware. Protected routes use `auth()` middleware. Role-based authorization supported with `auth('permission')`.

**Data Access**: Mongoose models use two custom plugins:
- `toJSON` - removes sensitive fields, maps `_id` to `id`
- `paginate` - adds paginate static method with sorting/filtering/pagination

**Logging**: Use Winston logger from `src/config/logger`. Severity levels: error → warn → info → http → verbose → debug. HTTP requests auto-logged via Morgan.

## Configuration & Environment

Copy `.env.example` to `.env` and configure:
- `PORT` - server port (default 3000)
- `MONGODB_URL` - MongoDB connection string
- `JWT_SECRET` - signing key for tokens
- `JWT_ACCESS_EXPIRATION_MINUTES`, `JWT_REFRESH_EXPIRATION_DAYS` - token TTLs
- `SMTP_*` - email service configuration

## Testing Structure

Tests are organized in `tests/`:
- `unit/` - isolated tests of services, models, utilities
- `integration/` - API endpoint tests with real database connections
- `fixtures/` - test data generators (uses Faker)
- `utils/` - test helpers and setup utilities

Jest is configured to run serially (`-i` flag) and detect open handles. Coverage reports exclude config and test files.

## Code Style

- ESLint: Airbnb style guide + Prettier + security checks
- Prettier: Enforced formatting via `yarn prettier:fix`
- Key rules: no console.log in production code, no leading underscores for private members, object bracket notation allowed

## API Documentation

Generated from JSDoc comments in route files. View at `http://localhost:3000/v1/docs` when server is running.

## MongoDB & Mongoose

- Connection happens in `src/index.js` before server starts
- Models in `src/models/` define schemas and attach plugins
- Services in `src/services/` encapsulate all database queries
- Use `User.paginate()` for query results with pagination metadata
