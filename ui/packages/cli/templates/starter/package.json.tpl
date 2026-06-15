{
  "name": "{{appName}}",
  "private": true,
  "version": "0.0.0",
  "type": "module",
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
    "@tetherto/mdk-ui-core": "^0.0.1",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.0"
  },
  "devDependencies": {
    "@antfu/eslint-config": "^6.7.3",
    "@eslint-react/eslint-plugin": "^2.0.1",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "eslint": "^9.39.2",
    "eslint-plugin-react-hooks": "^7.0.0",
    "eslint-plugin-react-refresh": "^0.4.19",
    "sass": "^1.83.0",
    "typescript": "^5.7.2",
    "vite": "^7.0.0"
  }
}
