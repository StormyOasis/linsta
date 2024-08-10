// jest.config.js
module.exports = {
    rootDir: './src',    
    setupFiles: ['../jest.polyfill.js'],
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
    },
    moduleNameMapper: {
        '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
          '<rootDir>/__mocks__/fileMock.js',
        '\\.(css|less)$': 'identity-obj-proxy',
      },
}