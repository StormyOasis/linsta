// jest.config.js
module.exports = {
    preset: 'ts-jest',
    rootDir: './',
    setupFiles: ['./jest.polyfill.js'],
    setupFilesAfterEnv: ['./jest.setup.js'],
    testEnvironment: "node",
    testEnvironmentOptions: {
        customExportConditions: [''],
    },
    testMatch: ['**/?(*.)+(spec|test).ts?(x)'],
    coverageDirectory: 'coverage',
    coverageReporters: ['html'],
    coveragePathIgnorePatterns: [
        "/node_modules/",
        "/build/",
        "/dist/",
        "/app/",
        "/coverage/",
        "/.serverless/"
    ],
    collectCoverage: true,
    coverageThreshold: {
        global: {
            lines: 90
        }
    },
    moduleNameMapper: {
        '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
            '<rootDir>/src/__mocks__/fileMock.js',
        '\\.(css|less)$': 'identity-obj-proxy',
    },
    transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
            tsconfig: 'tsconfig.json', // Add tsconfig options here
        }],
        '^.+\\.(js|jsx)$': 'babel-jest', // If using Babel for JS
    },
    transformIgnorePatterns: [
        '/node_modules/(?!uuid|other-esm-package)/'
    ]    
}