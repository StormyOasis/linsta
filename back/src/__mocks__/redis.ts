const mockConnect = jest.fn().mockResolvedValue({});
const mockDisconnect = jest.fn().mockResolvedValue(undefined);
const mockGet = jest.fn().mockResolvedValue('mocked-value');
const mockSet = jest.fn().mockResolvedValue(undefined);
const mockDel = jest.fn().mockResolvedValue(undefined);
const mockDbSize = jest.fn().mockResolvedValue(42);
const mockInfo = jest.fn().mockResolvedValue(
    "instantaneous_ops_per_sec:100\r\nconnected_clients:5\r\nused_memory:102400\r\nused_memory_peak:204800\r\nmem_fragmentation_ratio:1.5\r\nused_cpu_user:2.5\r\n"
);

const mockOn = jest.fn();

export const createClient = jest.fn(() => ({
    connect: mockConnect,
    disconnect: mockDisconnect,
    get: mockGet,
    set: mockSet,
    del: mockDel,
    dbSize: mockDbSize,
    info: mockInfo,
    on: mockOn
}));

export const __redisMocks = {
    mockConnect,
    mockDisconnect,
    mockGet,
    mockSet,
    mockDel,
    mockDbSize,
    mockInfo,
    mockOn,
    createClient
};
