# PhotoCull AI - Improvement Plan & Documentation

## Overview
PhotoCull AI is a React application built with Vite and TypeScript for sorting and culling photos using AI. It leverages the Gemini API for analysis and processing.

## Current State Analysis
- **Strengths**:
  - Clear use cases (grouping, analyzing, culling).
  - Use of custom hooks for separation of concerns (`useAIAnalysis`, `useImageGroups`, etc.).
  - Performance considerations with `react-virtuoso`.
- **Weaknesses**:
  - `App.tsx` is too large (nearly 800 lines) and contains a lot of UI rendering logic that could be componentized.
  - State management relies on custom hooks passing state down, which might become complex as features grow.
  - Lack of unit or integration tests.

## Proposed Improvements

### 1. Code Restructuring & Refactoring
- **Componentization**: Split `App.tsx` into smaller, focused components:
  - `Header`: Contains logo and global stats.
  - `Toolbar`: Contains search, sort, and batch action buttons.
  - `MainView`: Handles the conditional rendering of `DropZone` and `Virtuoso`.
  - `StatusOverlay`: Handles the processing status display.
- **State Management**: Consider using a lightweight state management library like **Zustand** to avoid "prop drilling" and keep the hooks cleaner.

### 2. New Features to Make it "More Powerful"
- **Advanced AI Culling Prompts**: Allow users to save and reuse custom prompts (e.g., "Find the best group photo", "Select images with closed eyes for removal").
- **Auto-Save**: Implement automatic saving of the project state to indexedDB or LocalStorage so users don't lose progress on reload.
- **Image Comparison View**: Add a side-by-side comparison view for 2 or 3 images to help users make manual decisions.
- **Background Processing**: If possible, use Web Workers for heavy image processing tasks to keep the UI responsive.

### 3. Documentation
- Create a `CONTRIBUTING.md` or `ARCHITECTURE.md` to explain the hook-based architecture.
- Add JSDoc comments to the custom hooks to explain their parameters and return values.

## Next Steps
1. Refactor `App.tsx` by extracting the `Header` and `Toolbar` into separate components.
2. Add a `docs` folder with more detailed documentation.
