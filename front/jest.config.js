// jest.config.js
module.exports = {
    rootDir: './',    
    setupFiles: ['./jest.polyfill.js'],
    testEnvironment: "jsdom",
    testEnvironmentOptions: {
        customExportConditions: [''],
    },
    coverageReporters: ['html'],
    collectCoverageFrom: [
        '**/*.{js,jsx,ts,tsx}',
        '!**/*stories.tsx',
        '!**/dist/**',
        '!/front/*',
        '!**/coverage/**',
        '!/node_modules/',
        '!**webpack**',        
        '!**jest**'
      ],
    collectCoverage: true,
    coverageThreshold: {
        global: {
            lines: 90
        }
    }
}