global.setInterval = jest.fn(); // Mock setInterval globally

afterAll(() => {
    global.setInterval.mockReset(); // Clean up the mock after all tests are finished
});