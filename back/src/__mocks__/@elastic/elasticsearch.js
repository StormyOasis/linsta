// __mocks__/@elastic/elasticsearch.js

// Mocking the methods that belong to the Client instance
const mockSearch = jest.fn();
const mockCount = jest.fn();
const mockIndex = jest.fn();
const mockUpdate = jest.fn();
const mockClose = jest.fn();

const Client = jest.fn().mockImplementation(() => {
    return {
      search: mockSearch,
      count: mockCount,
      index: mockIndex,
      update: mockUpdate,
      close: mockClose,
    };
  });

// Exporting the mock Client class
module.exports = { Client };