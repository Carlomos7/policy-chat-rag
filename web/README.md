# Policy Chat RAG - Web Frontend

Next.js frontend application for the Policy Chat RAG project. Provides an intuitive chat interface for querying University of Richmond policies.

## Overview

This is a modern, responsive web application built with Next.js that connects to the Policy RAG API backend. It provides:

- **Chat Interface** - Stream-based conversation UI with real-time responses
- **Conversation Management** - Thread-based conversations with history sidebar
- **Source Citations** - Display of policy sources for each answer
- **Dark/Light Theme** - Theme switching with system preference detection
- **Responsive Design** - Mobile-friendly interface using Tailwind CSS
- **Connection Status** - Real-time API health monitoring
- **Markdown Support** - Rich text rendering for policy answers

## Features

### Chat Experience
- **Streaming Responses** - Real-time streaming of AI-generated answers using Server-Sent Events (SSE)
- **Conversation Threads** - Create and manage multiple conversation threads
- **Message History** - Persistent conversation history with sidebar navigation
- **Source Display** - Expandable sources panel showing policy documents used for answers

### User Interface
- **Theme Support** - Dark and light themes with smooth transitions
- **Responsive Layout** - Works seamlessly on desktop, tablet, and mobile devices
- **Accessibility** - ARIA labels, keyboard navigation, and semantic HTML
- **Error Handling** - User-friendly error messages with retry functionality

### Performance
- **Optimized Rendering** - Server-side rendering and static generation where appropriate
- **Efficient State Management** - React Context for global state
- **Local Storage** - Conversation history persisted in browser storage

## Technology Stack

- **Next.js 16.1** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type-safe development
- **Tailwind CSS 4** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives (Tooltip, Popover)
- **React Markdown** - Markdown rendering for policy answers
- **Vercel AI SDK** - Client-side AI utilities

## Project Structure

```
web/
├── app/
│   ├── layout.tsx          # Root layout with providers
│   ├── page.tsx             # Main landing/chat page
│   ├── globals.css          # Global styles and Tailwind imports
│   └── favicon.ico          # Site favicon
├── components/
│   ├── chat-layout.tsx      # Main chat layout component
│   ├── conversation-sidebar.tsx  # History sidebar
│   ├── message-input.tsx    # Message input component
│   ├── message-list.tsx     # Message display list
│   ├── sources-sheet.tsx    # Sources panel
│   ├── streaming-text.tsx   # Streaming text component
│   ├── typewriter-text.tsx  # Typewriter effect component
│   ├── icons.tsx            # Icon components
│   └── ui/                  # Radix UI components
│       └── tooltip.tsx      # Tooltip component
├── lib/
│   ├── api.ts               # API client functions
│   ├── chat-context.tsx     # Chat state management
│   ├── theme-context.tsx    # Theme state management
│   ├── storage.ts           # Local storage utilities
│   ├── types.ts             # TypeScript type definitions
│   └── utils.ts             # Utility functions
├── public/                  # Static assets
├── next.config.ts           # Next.js configuration
├── tsconfig.json            # TypeScript configuration
├── package.json             # Dependencies and scripts
└── README.md                # This file
```

## Configuration

### Environment Variables

Create a `.env.local` file (or set environment variables) with:

```bash
# API Backend URL
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**For Docker builds**, the API URL can be set via build argument:
```bash
docker build --build-arg NEXT_PUBLIC_API_URL=http://api:8000 .
```

### Next.js Configuration

The application uses Next.js standalone output for Docker deployment:
- Output: `standalone` (configured in `next.config.ts`)
- This creates a minimal production build suitable for containers

## Development

### Prerequisites

- Node.js 22+ (check `package.json` for exact version)
- npm or compatible package manager
- API backend running at `http://localhost:8000` (or configure `NEXT_PUBLIC_API_URL`)

### Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment variables:**
```bash
cp .env.example .env.local
# Edit .env.local with your API URL
```

### Running Development Server

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Create production build
- `npm run start` - Start production server (requires build first)
- `npm run lint` - Run ESLint

### Development Features

- **Hot Module Replacement** - Instant updates during development
- **TypeScript** - Type checking and IntelliSense
- **ESLint** - Code quality and consistency checks
- **Fast Refresh** - React component hot reloading

## Building for Production

### Standalone Build

```bash
npm run build
```

This creates an optimized production build in `.next/standalone` directory.

### Docker Build

The Dockerfile uses multi-stage builds:

1. **Dependencies stage** - Install npm packages
2. **Builder stage** - Build the Next.js application
3. **Runner stage** - Minimal production image with Node.js

```bash
docker build -t policy-chat-web .
```

Or using Docker Compose from project root:
```bash
docker compose build web
```

### Production Run

**Using Node.js directly:**
```bash
npm run build
npm start
```

**Using Docker:**
```bash
docker run -p 3000:3000 -e NEXT_PUBLIC_API_URL=http://api:8000 policy-chat-web
```

## Key Components

### Chat Context (`lib/chat-context.tsx`)
Manages global chat state:
- Active conversation thread
- Message history
- Connection status
- Conversation list
- Error handling

### API Client (`lib/api.ts`)
Handles all backend communication:
- Health checks
- Thread creation
- Streaming message requests
- Error handling with user-friendly messages

### Theme Context (`lib/theme-context.tsx`)
Manages theme state:
- Dark/light mode
- System preference detection
- Local storage persistence

### Message Components
- **MessageList** - Displays conversation messages with markdown rendering
- **MessageInput** - Text input with auto-resize and keyboard shortcuts
- **StreamingText** - Real-time text streaming display
- **TypewriterText** - Animated typewriter effect for landing page

### UI Components
- **ConversationSidebar** - Slide-in history panel
- **SourcesSheet** - Expandable sources display
- **Tooltip** - Accessible tooltips using Radix UI

## API Integration

The frontend communicates with the FastAPI backend via:

### Endpoints Used

- `GET /health` - Health check for connection status
- `POST /threads` - Create new conversation thread
- `POST /chat/stream` - Send message and receive streaming response (SSE)

### Streaming Protocol

The application uses Server-Sent Events (SSE) for real-time streaming:

```
data: {"content": "token", "thread_id": "..."}

data: {"content": " chunk", "thread_id": "..."}

data: {"sources": ["policy1.txt"], "thread_id": "..."}
```

## Styling

- **Tailwind CSS 4** - Utility-first CSS framework
- **Custom Theme** - Dark and light mode color schemes
- **Responsive Design** - Mobile-first approach with breakpoints
- **Animations** - Smooth transitions and loading states

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance Considerations

- **Code Splitting** - Automatic route-based code splitting
- **Image Optimization** - Next.js automatic image optimization
- **Static Generation** - Static assets where possible
- **Lazy Loading** - Components loaded on demand
- **Efficient Re-renders** - React Context optimization

## Troubleshooting

### API Connection Issues
- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check API backend is running
- Review browser console for CORS errors
- Verify network connectivity

### Build Issues
- Clear `.next` directory and rebuild
- Ensure Node.js version matches requirements
- Check for TypeScript errors: `npm run lint`

### Runtime Errors
- Check browser console for errors
- Verify all environment variables are set
- Ensure API backend is accessible

## Requirements

- Node.js 22+
- npm or compatible package manager
- Access to Policy RAG API backend

See `package.json` for complete dependency list.

---

For questions or issues, open an issue on GitHub.
