// __mocks__/gremlin.ts

const mockClose = jest.fn().mockResolvedValue(undefined); // Mock close method

const mockDriverRemoteConnectionInstance = {
    close: mockClose, // Mock close method for the instance
    isOpen: true, // Return true for isOpen property
};

const mockDriverRemoteConnection = jest.fn(() => mockDriverRemoteConnectionInstance); // Mock the constructor

// Mock the Transaction methods
export const mockTransaction = {
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined),
    begin: jest.fn().mockReturnThis(),
};

const mockGraphTraversalSource = jest.fn(() => ({
    tx: jest.fn(() => mockTransaction), // tx should return the mockTransaction
    withRemote: jest.fn().mockReturnThis(), // Chainable mock for withRemote
}));

// Mock AnonymousTraversalSource
const mockAnonymousTraversalSource = {
    traversal: jest.fn().mockReturnValue(mockGraphTraversalSource()), // Return the mocked traversal source
};

// Mock the statics object correctly
const mockStatics = {
    traversal: jest.fn().mockReturnValue(mockGraphTraversalSource()), // Mock traversal function to return a traversal source
};

const gremlin = {
    driver: {
        DriverRemoteConnection: mockDriverRemoteConnection,
        auth: {
            PlainTextSaslAuthenticator: jest.fn(),
        },
    },
    process: {
        // Make sure AnonymousTraversalSource is correctly mocked
        AnonymousTraversalSource: mockAnonymousTraversalSource,  // Correctly mock AnonymousTraversalSource
        GraphTraversalSource: mockGraphTraversalSource,  // Mock GraphTraversalSource
        Transaction: jest.fn(() => mockTransaction),  // Mock Transaction
        t: jest.fn(),
        P: jest.fn(),
        column: jest.fn(),
        merge: jest.fn(),
        statics: mockStatics,  // Mock statics correctly
    },
};

export default gremlin;
