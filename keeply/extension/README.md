# Keeply — Chrome Extension

AI-powered tab manager. One click — tabs grouped in seconds.

## Stack

- **Extension**: Chrome MV3 + TypeScript strict + React 18 + Zustand
- **Build**: Vite + @crxjs/vite-plugin
- **Tests**: Vitest + React Testing Library
- **Backend**: Supabase Edge Functions + GPT-4o-mini

## Getting Started

```bash
cd extension
npm install
```

### Development

```bash
npm run dev
```

Open Chrome → `chrome://extensions` → Enable Developer Mode → Load Unpacked → select `dist/`

### Tests

```bash
npm test              # Run all tests once
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

### Build for production

```bash
npm run build
```

### Type check

```bash
npm run typecheck
```

## Project Structure

```
src/
├── shared/
│   ├── types/index.ts          # All domain types
│   ├── constants/index.ts      # Magic numbers, URLs
│   ├── utils/
│   │   ├── usageUtils.ts       # Free tier counter (pure functions)
│   │   ├── tabUtils.ts         # Tab filtering + AI response parser
│   │   └── promptBuilder.ts    # AI prompt construction
│   └── services/
│       └── storageService.ts   # Chrome storage abstraction
├── background/
│   ├── index.ts                # Service worker entry
│   ├── tabGrouper.ts           # Core grouping orchestration
│   └── messageHandler.ts       # Typed message routing
└── popup/
    ├── App.tsx                 # Screen router
    ├── stores/                 # Zustand state
    ├── hooks/                  # Custom React hooks
    └── components/             # UI components
tests/
├── setup.ts                    # Global Chrome mocks
└── unit/                       # Unit tests (Vitest)
```

## Environment Variables

Create `.env.local`:

```
VITE_EDGE_FUNCTION_URL=https://your-project.supabase.co/functions/v1/ai-group
```

## Architecture Principles

1. **Clean Architecture** — Domain layer has no dependencies on Chrome/React
2. **Result<T, E>** — No thrown exceptions, explicit error handling
3. **Dependency Injection** — Chrome APIs injected, not called directly (testable)
4. **Immutability** — All state updates return new objects
5. **Typed Messages** — Discriminated unions for popup ↔ background
