import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'tests',testMatch:'ui.spec.ts',fullyParallel:false,
  use:{baseURL:'http://127.0.0.1:4175',trace:'retain-on-failure'},
  webServer:{command:'node --experimental-strip-types tests/browser-host.ts',url:'http://127.0.0.1:4175',reuseExistingServer:false,timeout:30000}
});
