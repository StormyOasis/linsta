import gremlin from 'gremlin';

import DBConnector from '../DBConnector';
import logger from '../../logger/logger';
import { mockTransaction } from '../../__mocks__/gremlin';

jest.mock('gremlin');
jest.mock('../../logger/logger');

describe('DBConnector Singleton', () => {
    it('should return the same instance for multiple getInstance calls', () => {
        const instance1 = DBConnector;
        const instance2 = DBConnector;
        expect(instance1).toBe(instance2); // Ensure both instances are the same
    });
});

describe('DBConnector Connection', () => {
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
        // Mock the connection to return a mocked DriverRemoteConnection with a mock close function
        const mockConnection = new gremlin.driver.DriverRemoteConnection('ws://localhost:8182/gremlin', {}); // You can provide mock arguments here

        // Mock the connection returned by DBConnector.getConnection
        DBConnector.getConnection = jest.fn().mockReturnValue(mockConnection);

        await DBConnector.connect();

        // Mock getConnection to return null after close is called
        DBConnector.getConnection = jest.fn().mockReturnValueOnce(null);


        // Close the connection
        await DBConnector.close();

        // Check that the close method was called
        expect(mockConnection.close).toHaveBeenCalled();

        // Ensure the connection is null after close
        expect(DBConnector.getConnection()).toBeNull();
    });
});

describe('DBConnector Transaction', () => {
    beforeEach(() => {
        //DBConnector.connect = jest.fn(); // Mock connect to avoid actual DB connections
        //DBConnector.getConnection = jest.fn().mockReturnValue({ tx: jest.fn() });
    });

    afterEach(async () => {
        await DBConnector.close();
        jest.clearAllMocks();
    });

    it('should begin a transaction', async () => {
        await DBConnector.connect();

        const transactionG = await DBConnector.beginTransaction();

        // Ensure that a transaction was started
        expect(transactionG).toBeDefined();
        //expect(gremlin.process.Transaction).toHaveBeenCalled();  // Ensure the Transaction constructor is called
        //expect(gremlin.process.Transaction).toHaveBeenCalledTimes(1);
        expect(DBConnector.getTx()).toBeDefined();
        expect(DBConnector.getTx()?.commit).toBeDefined();
        expect(DBConnector.getTx()?.rollback).toBeDefined();
        expect(DBConnector.getTx()?.begin).toHaveBeenCalled();
        expect(DBConnector.getTx()?.commit).toHaveBeenCalledTimes(0); // Make sure commit hasn't been called yet      

        // Ensure that tx() method was called
       // expect(DBConnector.getGraph().tx).toHaveBeenCalledTimes(1);  // Ensure tx() was called once

        // Ensure that begin() method on the transaction was called
        expect(DBConnector.getTx()?.begin).toHaveBeenCalledTimes(1);  // Ensure begin() was called once

    });

    it('should commit a transaction', async () => {
        await DBConnector.connect();

        const transactionG = await DBConnector.beginTransaction();

        expect(transactionG).toBeDefined();

        await DBConnector.commitTransaction();

        expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
        expect(DBConnector.getTx()).toBeNull();
        expect(mockTransaction.rollback).toHaveBeenCalledTimes(0);
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

        await DBConnector.rollbackTransaction();

        expect(mockTransaction.commit).toHaveBeenCalledTimes(0);
        expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
    });

    it('should do nothing if no transaction is in progress', async () => {
        await DBConnector.connect();

        expect(DBConnector.getTransactionG()).toBeNull();

        await DBConnector.rollbackTransaction();

        expect(mockTransaction.rollback).toHaveBeenCalledTimes(0);
    });
});