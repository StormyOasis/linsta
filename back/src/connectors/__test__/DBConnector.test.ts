import gremlin from 'gremlin';

import DBConnector from '../DBConnector';
import logger from '../../logger/logger';

jest.mock('gremlin');
jest.mock('../../logger/logger');
jest.mock('../../config');
jest.mock('../../metrics/Metrics');

describe('DBConnector Singleton', () => {
    it('should return the same instance for multiple getInstance calls', () => {
        const instance1 = DBConnector;
        const instance2 = DBConnector;
        expect(instance1).toBe(instance2); // Ensure both instances are the same
    });
});

describe('DBConnector Connection', () => {
    let mockTx: unknown;
    let mockBegin: unknown;
    let mockTransactionG: unknown;
    beforeAll(() => {
        // Mock the traversal chain for gremlin
        const mockToList = jest.fn().mockResolvedValue([]);
        const mockLimit = jest.fn(() => ({ toList: mockToList }));
        const mockV = jest.fn(() => ({ limit: mockLimit }));

        // Mock transaction object
        mockTransactionG = {
            withRemote: jest.fn(),
            tx: jest.fn(),
            toList: jest.fn(),
            V: jest.fn(),
            addV: jest.fn(),
            addE: jest.fn(),
            has: jest.fn(),
            next: jest.fn(),
            limit: jest.fn(),
            values: jest.fn(),
            property: jest.fn(),
            out: jest.fn(),
            in: jest.fn(),
            outE: jest.fn(),
            inE: jest.fn(),
            both: jest.fn(),
            bothE: jest.fn(),
            drop: jest.fn(),
            iterate: jest.fn()
        } as unknown as gremlin.process.GraphTraversalSource<gremlin.process.GraphTraversal>;
        mockBegin = jest.fn(() => mockTransactionG);
        const mockCommit = jest.fn();
        const mockRollback = jest.fn();
        mockTx = jest.fn(() => ({
            begin: mockBegin,
            commit: mockCommit,
            rollback: mockRollback,
        }));

        // Add tx to the traversal source mock
        const mockWithRemote = jest.fn(() => ({
            V: mockV,
            tx: mockTx,
        }));

        const mockTraversal = jest.fn(() => ({ withRemote: mockWithRemote }));

        // @ts-expect-error mock
        gremlin.process.AnonymousTraversalSource.traversal = mockTraversal;
    });

    afterEach(async () => {
        await DBConnector.close();
        jest.clearAllMocks();
    });

    it('should establish a connection with the database', async () => {
        await DBConnector.connect();

        expect(DBConnector.getConnection()).toBeDefined(); // Check if the connection is established
        expect(logger.info).toHaveBeenCalledWith('Connection created');
    });

    it('should create a connection and use withRemote', async () => {
        await DBConnector.connect();

        expect(gremlin.process.AnonymousTraversalSource.traversal).toHaveBeenCalled();
        expect(gremlin.process.AnonymousTraversalSource.traversal().withRemote).toHaveBeenCalled();
    });

    it('should close the connection properly', async () => {
        // Create a mock connection with a mock close method
        const mockConnection = { close: jest.fn(), isOpen: true };

        // Force the singleton to use our mock connection
        // @ts-ignore
        DBConnector.connection = mockConnection;

        // Call close
        await DBConnector.close();

        // Check that the close method was called
        expect(mockConnection.close).toHaveBeenCalled();

        // Ensure the connection is null after close
        expect(DBConnector.getConnection()).toBeNull();
    });

    it('should begin a transaction', async () => {
        await DBConnector.connect();

        const transactionG = await DBConnector.beginTransaction();

        // Ensure that a transaction was started
        expect(transactionG).toBeDefined();

        expect(DBConnector.getTx()).toBeDefined();
        expect(DBConnector.getTx()?.commit).toBeDefined();
        expect(DBConnector.getTx()?.rollback).toBeDefined();
        expect(DBConnector.getTx()?.begin).toHaveBeenCalled();
        expect(DBConnector.getTx()?.commit).toHaveBeenCalledTimes(0); // Make sure commit hasn't been called yet      

        // Ensure that tx() method was called once
        expect(mockTx).toHaveBeenCalledTimes(1);
        // Ensure that begin() method on the transaction was called once
        expect(DBConnector.getTx()?.begin).toHaveBeenCalledTimes(1);
    });

    it('should commit a transaction', async () => {
        await DBConnector.connect();

        const transactionG = await DBConnector.beginTransaction();
        expect(transactionG).toBeDefined();

        // Capture the tx object before commit
        const tx = DBConnector.getTx();

        await DBConnector.commitTransaction();

        expect(tx?.commit).toHaveBeenCalledTimes(1);
        expect(tx?.rollback).toHaveBeenCalledTimes(0);
    });

    it('should throw if beginTransaction is called when already in a transaction', async () => {
        await DBConnector.connect();
        // Simulate existing transaction
        DBConnector['transactionG'] = mockTransactionG as gremlin.process.GraphTraversalSource<gremlin.process.GraphTraversal>;

        await expect(DBConnector.beginTransaction()).rejects.toThrow("Transaction already in progress");
        DBConnector['transactionG'] = null;
    });

    it('should throw an error if commitTransaction is called without a transaction', async () => {
        DBConnector['transactionG'] = null;
        DBConnector['tx'] = null;
        await expect(DBConnector.commitTransaction()).rejects.toThrow("No transaction in progress");
    });

    it('should rollback a transaction', async () => {
        await DBConnector.connect();

        const transactionG = await DBConnector.beginTransaction();
        expect(transactionG).toBeDefined();

        // Capture the tx object before commit
        const tx = DBConnector.getTx();

        await DBConnector.rollbackTransaction();

        expect(tx?.commit).toHaveBeenCalledTimes(0);
        expect(tx?.rollback).toHaveBeenCalledTimes(1);
    });

    it('should do nothing if no transaction is in progress', async () => {
        await DBConnector.connect();

        expect(DBConnector.getTransactionG()).toBeNull();

        // Capture the tx object before commit
        const tx = DBConnector.getTx();

        await DBConnector.rollbackTransaction();

        expect(tx).toBeNull();
    });

    it('should return gremlin process statics', () => {
        expect(DBConnector.T()).toBe(gremlin.process.t);
        expect(DBConnector.P()).toBe(gremlin.process.P);
        expect(DBConnector.Column()).toBe(gremlin.process.column);
        expect(DBConnector.Merge()).toBe(gremlin.process.merge);
        expect(DBConnector.__()).toBe(gremlin.process.statics);
    });

    it('should parseGraphResult from Map and object', () => {
        const map = new Map([['foo', 'bar']]);
        const obj = { foo: 'baz' };
        expect(DBConnector.parseGraphResult<{ foo: string }>(map, ['foo'])).toEqual({ foo: 'bar' });
        expect(DBConnector.parseGraphResult<{ foo: string }>(obj, ['foo'])).toEqual({ foo: 'baz' });
    });

    it('should extractMapFromResult from Map and object/value', () => {
        const map = new Map([['foo', 'bar']]);
        expect(DBConnector.extractMapFromResult(map)).toBe(map);
        expect(DBConnector.extractMapFromResult({ object: map })).toBe(map);
        expect(DBConnector.extractMapFromResult({ value: map })).toBe(map);
    });

    it('should throw extractMapFromResult for invalid input', () => {
        expect(() => DBConnector.extractMapFromResult({})).toThrow("Unexpected result format: not a Map");
    });

    it('should unwrapResult from Map and object', () => {
        const map = new Map([['foo', 'bar']]);
        expect(DBConnector.unwrapResult(map)).toBe(map);
        expect(DBConnector.unwrapResult({ object: map })).toBe(map);
        expect(DBConnector.unwrapResult({ value: map })).toBe(map);
        expect(DBConnector.unwrapResult({ foo: 'bar' })).toEqual({ foo: 'bar' });
    });

    it('should throw unwrapResult for invalid input', () => {
        expect(() => DBConnector.unwrapResult(null)).toThrow("Unexpected result format");
        expect(() => DBConnector.unwrapResult(123)).toThrow("Unexpected result format");
    });
});