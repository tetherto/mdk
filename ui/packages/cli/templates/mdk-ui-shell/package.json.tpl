{
  "name": "{{appName}}",
  "type": "module",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  },
  "dependencies": {
    "@tetherto/mdk-fonts": "^0.0.1",
    "@tetherto/mdk-react-adapter": "^0.0.1",
    "@tetherto/mdk-react-devkit": "^0.0.1",
    "@tetherto/mdk-ui-foundation": "^0.0.1",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-router-dom": "^7.13.0"
  },
  "devDependencies": {
    "@antfu/eslint-config": "^6.7.3",
    "@eslint-react/eslint-plugin": "^2.0.1",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^5.1.4",
    "eslint": "^9.39.2",
    "eslint-plugin-react-hooks": "^7.0.0",
    "eslint-plugin-react-refresh": "^0.4.19",
    "sass": "^1.83.0",
    "typescript": "^5.7.2",
    "vite": "^7.0.0"
  },
  "overrides": {
    "ws@>=8.0.0 <=8.20.0": ">=8.20.1"
  }
}
