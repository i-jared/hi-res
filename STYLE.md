# Style Guide

## Core Libraries

- **Firebase**: Authentication, document storage, and Firestore database
- **TanStack Query** (React Query): Data fetching, caching, and synchronization
- **Next.js**: Static export for GitHub Pages hosting
- **TypeScript**: Type safety throughout
- **Tailwind CSS**: Utility-first styling

## Best Practices

### Data Fetching
- Use TanStack Query for all server data fetching
- Prefer `useQuery` hooks over direct Firebase calls in components
- Implement proper error boundaries and loading states

### Firebase
- Use Firebase Auth for authentication
- Store documents in Firebase Storage
- Use Firestore for real-time database operations
- Keep Firebase config in environment variables

### Code Style
- Use TypeScript strict mode
- Prefer functional components with hooks
- Keep components small and focused
- Use meaningful variable and function names

### Static Export
- All routes must be statically generatable
- No server-side rendering or API routes
- Use client-side data fetching with React Query

### Git & Deployment
- Static site hosted on GitHub Pages
- Build output goes to `out/` directory
- Keep commits focused and atomic

### Visual Design
- **Color Scheme**: Use black as the primary color throughout
  - Background: black (`bg-black`)
  - Text: white/light colors for contrast (`text-white`, `text-gray-100`)
  - Accents: subtle grays if needed, but prefer pure black
- **Containers**: Avoid container components and wrapper divs
  - Prefer direct layout without unnecessary nesting
  - Use minimal structural elements
- **Shadows**: Do not use shadows (`shadow-*` classes)
  - No drop shadows, box shadows, or text shadows
- **Border Radius**: Use small, minimal border radius only when necessary
  - Prefer `rounded-sm` or `rounded` at most
  - Avoid large radius values (`rounded-lg`, `rounded-xl`, etc.)
- **Overall Aesthetic**: Minimal, stark, black-focused design
  - Clean lines and simple layouts
  - High contrast for readability
  - No decorative elements

NO UNNECESSARY COMMENTS - STRICTLY FORBIDDEN
USE BUN RATHER THAN NPM