# Product Requirements Document (PRD) - PhotoCull AI Improvement

## 1. Vision & Objective
PhotoCull AI aims to be the ultimate tool for photographers to quickly sort, cull, and enhance their images using AI.

## 2. Personas
- **The Speed Culler**: Needs to process thousands of shots rapidly.
- **The Detail Editor**: Looks for subtle details and relies on AI for quality checks.

## 3. Proposed Features
- **Auto-Save/State Persistence**: Save project state to IndexedDB.
- **Side-by-Side Comparison**: Split-screen view in the modal.
- **Custom AI Prompts**: Save and load custom prompts.

## 4. Architecture Plan
- Refactor `App.tsx` into smaller components.
- Use Zustand for state management.
