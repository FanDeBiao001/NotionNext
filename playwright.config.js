const { defineConfig } = require('@playwright/test')
module.exports = defineConfig({
  testDir: './e2e',
  timeout: 45000,
  use: {
    baseURL: 'http://127.0.0.1:3210',
    browserName: 'chromium',
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? {
          launchOptions: {
            executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
          }
        }
      : {}),
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'yarn start -p 3210',
    url: 'http://127.0.0.1:3210/library',
    timeout: 120000,
    reuseExistingServer: !process.env.CI
  },
  reporter: [['list']]
})
