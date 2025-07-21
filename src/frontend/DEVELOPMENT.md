# IFTAA Frontend Development Guide

## Project Overview
React-based admin & user dashboard for the Islamic Fatwa Management System (IFTAA). Built with Vite, TypeScript, and Tailwind CSS.

## Tech Stack
- **Framework**: React 18 with Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom Islamic theme
- **State Management**: Context API (Auth, Language)
- **Routing**: React Router v6
- **Testing**: Vitest + React Testing Library
- **API Client**: Fetch API
- **Build Tool**: Vite with SWC

## Theme & Design System
- **Primary Colors**: Islamic Gold (#D4AF37), Navy Blue (#1F4E79)
- **Typography**: Inter font family
- **RTL/LTR Support**: Full bidirectional text support
- **Responsive**: Mobile-first design with Tailwind breakpoints

## Project Structure
```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components (Button, Input, Modal)
│   ├── layout/         # Layout components (Header, Sidebar, Footer)
│   ├── search/         # Search-related components
│   ├── fatwa/          # Fatwa-specific components
│   └── admin/          # Admin-only components
├── contexts/           # React Context providers
├── hooks/              # Custom React hooks
├── pages/              # Page components
├── types/              # TypeScript type definitions
├── utils/              # Utility functions and API client
├── test/               # Test setup and utilities
└── translations.ts     # Internationalization system
```

## Key Features

### 1. Internationalization (i18n)
- **Languages**: Arabic (default), English
- **Direction**: RTL for Arabic, LTR for English
- **Implementation**: Simple key-value system in `translations.ts`
- **Usage**: `t('key', language, params)`

### 2. Authentication & Authorization
- **JWT-based**: Token stored in localStorage
- **Role-based**: Admin, Scholar, User roles
- **Context**: `AuthContext` for global auth state
- **Protection**: Route guards for admin/scholar pages

### 3. Search System
- **Global Search**: Top-bar search across all fatwas
- **Category Search**: Scoped search within categories
- **Semantic Search**: AI-powered similarity search
- **Live Suggestions**: Debounced search with autocomplete

### 4. Component Architecture

#### Layout Components
- `Header`: Navigation with auth controls and search
- `Sidebar`: Lazy-loading category tree navigation
- `Footer`: Site information and links

#### UI Components
- `Button`: Consistent button styles with variants
- `Input/TextArea`: Form inputs with validation states
- `Select`: Dropdown with search capability
- `Modal`: Accessible modal dialogs
- `Table`: Data tables with sorting and pagination

#### Business Components
- `FatwaTable`: Paginated fatwa listing with admin controls
- `FatwaFormModal`: CRUD form for fatwa management
- `CategoryTree`: Hierarchical category navigation
- `SearchBar`: Global search with suggestions

### 5. State Management
- **Auth State**: User info, tokens, permissions
- **Language State**: Current language, text direction
- **Form State**: Custom `useFormValidation` hook
- **API State**: Loading states, error handling

## Development Workflow

### Setup
```bash
cd src/frontend
npm install
npm run dev
```

### Testing
```bash
npm run test          # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

### Linting & Type Checking
```bash
npm run lint          # ESLint
npm run lint:fix      # Auto-fix issues
npm run typecheck     # TypeScript check
```

### Building
```bash
npm run build         # Production build
npm run preview       # Preview production build
npm run build:analyze # Bundle analysis
```

## API Integration

### Base Configuration
- **Base URL**: `http://localhost:5000/api`
- **Authentication**: Bearer token in Authorization header
- **Error Handling**: Centralized error responses
- **Loading States**: Built-in loading indicators

### API Endpoints
```typescript
// Authentication
POST /auth/login
POST /auth/register
POST /auth/refresh

// Fatwas
GET /fatwas
GET /fatwas/{id}
POST /fatwas
PUT /fatwas/{id}
DELETE /fatwas/{id}

// Search
GET /search?q={query}&category={id}
POST /search/semantic

// Categories
GET /categories
GET /categories/{id}/children
```

### Usage Example
```typescript
import { fatwaApi } from '@utils/api';

// Fetch fatwas with pagination
const fatwas = await fatwaApi.getAll({
  page: 1,
  limit: 20,
  category: 'prayer'
});

// Create new fatwa
const newFatwa = await fatwaApi.create({
  FatwaId: 1001,
  TitleAr: 'عنوان الفتوى',
  QuestionAr: 'نص السؤال',
  AnswerAr: 'نص الجواب',
  Category: 'العبادات'
});
```

## Performance Guidelines

### Bundle Optimization
- **Target**: <250KB gzipped bundle size
- **Tree Shaking**: Import only used functions
- **Code Splitting**: Route-based and component-based
- **Lazy Loading**: Images, components, and data

### Loading Strategies
- **Skeleton Screens**: For loading states
- **Infinite Scroll**: For large data sets
- **Debounced Search**: 300ms delay for search inputs
- **Cached Results**: Store frequently accessed data

### Lighthouse Targets
- **Performance**: ≥90
- **Accessibility**: ≥90
- **Best Practices**: ≥90
- **SEO**: ≥90

## Accessibility Guidelines

### WCAG Compliance
- **Level**: AA compliance target
- **Screen Readers**: Proper ARIA labels and roles
- **Keyboard Navigation**: Full keyboard accessibility
- **Color Contrast**: Minimum 4.5:1 ratio

### Implementation
- **Focus Management**: Proper focus handling in modals
- **Semantic HTML**: Use appropriate HTML elements
- **Alt Text**: All images have descriptive alt text
- **Form Labels**: All inputs have associated labels

## Security Considerations

### Input Validation
- **Client-side**: Immediate feedback for users
- **Server-side**: Never trust client validation alone
- **XSS Prevention**: Sanitize all user inputs
- **CSRF Protection**: Token-based protection

### Authentication Security
- **Token Storage**: Secure localStorage usage
- **Token Expiry**: Automatic refresh handling
- **Route Protection**: Server-side validation required
- **Permission Checks**: Role-based access control

## Deployment

### Production Build
```bash
npm run build
```

### Environment Variables
```env
VITE_API_BASE_URL=https://api.iftaa.example.com
VITE_APP_NAME=IFTAA System
VITE_APP_VERSION=1.0.0
```

### CI/CD Pipeline
- **Linting**: ESLint with error on warnings
- **Type Checking**: TypeScript strict mode
- **Testing**: 100% test requirement for utils
- **Bundle Analysis**: Size limit enforcement
- **Security Audit**: Dependency vulnerability checks

## Contributing

### Code Style
- **Prettier**: Automatic formatting
- **ESLint**: Strict TypeScript rules
- **Naming**: PascalCase for components, camelCase for functions
- **File Organization**: Index files for clean imports

### Git Workflow
- **Branch Naming**: `feature/feature-name`, `fix/bug-name`
- **Commit Messages**: Conventional commits format
- **PR Requirements**: All checks must pass
- **Code Review**: Required for all changes

### Testing Requirements
- **Unit Tests**: All utility functions
- **Integration Tests**: Critical user flows
- **E2E Tests**: Main application workflows
- **Coverage**: Minimum 80% for new code

## Troubleshooting

### Common Issues
1. **Build Failures**: Check TypeScript errors first
2. **Test Failures**: Verify mock implementations
3. **Bundle Size**: Use webpack-bundle-analyzer
4. **Performance**: Check React DevTools Profiler

### Development Tools
- **React DevTools**: Component debugging
- **Redux DevTools**: State inspection (if needed)
- **Network Tab**: API request monitoring
- **Lighthouse**: Performance auditing

## Resources
- [React Documentation](https://react.dev)
- [Vite Guide](https://vitejs.dev/guide/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)