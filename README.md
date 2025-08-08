# Virtual Closet (Vite + React + TypeScript)

A minimal, GitHub‑ready prototype of a **virtual closet** app. Upload photos of clothes, get automatic color + type guesses, set your style/physique profile, and receive outfit suggestions with rationale.

## Stack
- Vite + React + TypeScript
- Tailwind CSS
- framer‑motion, lucide‑react

## Local Dev
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
npm run preview
```

## Notes
- All data is stored in `localStorage` (no backend).
- Color detection is a simple canvas average; replace with k‑means for better accuracy.
- Replace the rules engine with real AI: a vision classifier (type, color palette, pattern) and an LLM for personalized styling constrained by branding parameters.
