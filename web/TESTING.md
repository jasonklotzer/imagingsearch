# Unit Tests

This project includes unit tests for the Express backend and React frontend.

## Running Tests

### All tests
```bash
npm test
```

### React tests only
```bash
npm test src/
```

### Backend tests only
```bash
npm test -- --testPathPattern="(server|translateNlp)"
```

## Test Coverage

### test/translateNlp.test.js
- Validates Gemini integration and response formatting
- Mocks GoogleGenAI API calls

### test/server.test.js
- Tests POST /api/query endpoint validation and error handling
- Mocks BigQuery and translateNlp dependencies
- Validates request/response formats

### src/App.test.js
- Tests React component rendering
- Validates user interactions (text input, dropdown selection, search button)
- Mocks fetch API calls and response handling
- Tests error and loading states

## Development

Tests use Jest and React Testing Library for unit and component testing. Mock dependencies to isolate test concerns and keep tests fast and deterministic.

To write new tests:
1. Follow the existing test patterns
2. Mock external dependencies (BigQuery, Gemini, fetch)
3. Test both happy path and error scenarios
4. Use descriptive test names
