#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Crear el directorio si no existe
const moduleScriptsDir = path.join(__dirname, '..', 'node_modules', 'expo-module-scripts');
if (!fs.existsSync(moduleScriptsDir)) {
  fs.mkdirSync(moduleScriptsDir, { recursive: true });
}

// Contenido del tsconfig.base
const tsconfigBase = {
  "compilerOptions": {
    "allowSyntheticDefaultImports": true,
    "jsx": "react-native",
    "lib": ["dom", "esnext"],
    "moduleResolution": "node",
    "noEmit": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "strict": false,
    "target": "esnext"
  }
};

// Crear tanto el archivo con extensión .json como sin ella
const baseFile = path.join(moduleScriptsDir, 'tsconfig.base');
const jsonFile = path.join(moduleScriptsDir, 'tsconfig.base.json');

fs.writeFileSync(baseFile, JSON.stringify(tsconfigBase, null, 2));
fs.writeFileSync(jsonFile, JSON.stringify(tsconfigBase, null, 2));

console.log('✅ Fixed expo-notifications tsconfig.base missing file issue');