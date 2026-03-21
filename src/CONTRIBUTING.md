# Contributing to FLIGHTDECK

Thank you for your interest in contributing to FLIGHTDECK! This document provides guidelines and information for developers.

## Development Workflow

### Branch Strategy

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - Feature branches
- `bugfix/*` - Bug fix branches
- `hotfix/*` - Production hotfixes

### Making Changes

1. Create a feature branch from `develop`:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following the coding standards below

3. Test your changes thoroughly

4. Commit with clear, descriptive messages:
   ```bash
   git commit -m "feat: add producing broker commission tracking"
   ```

5. Push and create a pull request:
   ```bash
   git push origin feature/your-feature-name
   ```

## Coding Standards

### TypeScript

- Use TypeScript for all new files
- Define proper types/interfaces (avoid `any`)
- Use type imports: `import type { TypeName } from './types'`

### React Components

- Use functional components with hooks
- Keep components focused and single-purpose
- Extract reusable logic into custom hooks
- Use proper prop types

Example:
```typescript
interface MyComponentProps {
  title: string;
  onAction: (id: string) => void;
}

export function MyComponent({ title, onAction }: MyComponentProps) {
  // Component logic
}
```

### Styling

- Use Tailwind CSS utility classes
- Follow the design system:
  - Primary color: `#004225` (British Racing Green)
  - Use semantic color tokens from `globals.css`
  - Maintain text hierarchy with `text-gray-900/700/500`
- Avoid inline styles unless absolutely necessary
- Use the `cn()` utility for conditional classes

### File Organization

- Components go in `/components`
- UI components (shadcn/ui) go in `/components/ui`
- Utility functions go in `/utils`
- Type definitions go in `/types`
- Keep files focused and reasonably sized (< 500 lines)

### Naming Conventions

- Components: PascalCase (`PlacementForm.tsx`)
- Utilities: camelCase (`placementFormHelpers.ts`)
- Constants: UPPER_SNAKE_CASE
- CSS classes: kebab-case (Tailwind utilities)

### Backend (Supabase Edge Functions)

- All server code goes in `/supabase/functions/server/`
- **DO NOT** modify `/supabase/functions/server/kv_store.tsx` (protected file)
- Use proper error handling and logging
- Validate input data
- Use TypeScript for type safety
- Prefix all routes with `/make-server-afd91142`
- Use environment variables for secrets

Example route:
```typescript
app.post('/make-server-afd91142/placements', async (c) => {
  try {
    // Route logic
  } catch (error) {
    console.log('Error creating placement:', error);
    return c.json({ error: 'Failed to create placement' }, 500);
  }
});
```

## Testing

- Test all new features manually
- Test status transitions and workflow
- Verify PDF generation works correctly
- Test email notifications (if applicable)
- Check responsive design on mobile and desktop
- Test with different user roles (broker/underwriter)

## Product-Specific Guidelines

### Aviation Product Codes

- **HL**: Hull & Spares
- **HW**: Hull War
- **PA**: Personal Accident
- **LOL**: Loss of License
- **HD**: Hull Deductible
- **UAS**: Unmanned Aircraft Systems

### Status Workflow

Always follow the proper status progression:
```
DRAFT → PENDING → QUOTED → FIRM ORDER → BOUND
         ↓          ↓
      DECLINED    NTU
```

### Document Generation

- Binding Slip: Green accent (#004225)
- EOC Covering Letter: Amber accent
- Claims Notification: Purple accent

## Commit Message Format

Use conventional commits:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Examples:
```
feat: add contact manager bulk upload
fix: correct placement status transition logic
docs: update README with deployment instructions
refactor: extract PDF generation into separate utility
```

## Questions or Issues?

If you have questions or run into issues, please:

1. Check existing documentation
2. Review similar implementations in the codebase
3. Ask the team in your communication channel
4. Create an issue if you've found a bug

## Code Review

All pull requests require review before merging. Reviewers will check:

- Code quality and standards compliance
- Proper TypeScript usage
- Design system consistency
- Functionality and testing
- Documentation updates

Thank you for contributing to FLIGHTDECK!
