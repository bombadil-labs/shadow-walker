import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
export default defineConfig({root:'apps/dashboard',plugins:[viteSingleFile()],build:{outDir:'../../dist/dashboard',emptyOutDir:true,target:'es2022'}});
