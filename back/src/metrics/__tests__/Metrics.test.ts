jest.mock('../../logger/logger', () => ({
    __esModule: true,
    default: { error: jest.fn(), warn: jest.fn() }
}));

/* eslint-disable @typescript-eslint/no-explicit-any */
import Metrics, { withMetrics } from '../Metrics';
import { StatsD } from 'hot-shots';

jest.mock('hot-shots');
jest.mock('../../config', () => ({
    metrics: {
        statsd: {
            host: 'localhost',
            port: 8125
        }
    }
}));

describe('Metrics', () => {
    let statsdMock: any;
    beforeEach(() => {
        statsdMock = {
            increment: jest.fn(),
            timing: jest.fn(),
            gauge: jest.fn(),
            histogram: jest.fn(),
            close: jest.fn(),
            socket: true
        };
        (StatsD as unknown as jest.Mock).mockImplementation(() => statsdMock);
        // Reset singleton
        (Metrics as any).instance = null;
    });

    afterEach(() => {
        jest.clearAllMocks();
        (Metrics as any).instance = null;
    });

    it('should create a singleton instance', () => {
        const instance1 = Metrics.getInstance();
        const instance2 = Metrics.getInstance();
        expect(instance1).toBe(instance2);
    });

    it('should call increment on StatsD client', () => {
        const metrics = Metrics.getInstance();
        metrics.increment('test.stat', 2);
        expect(statsdMock.increment).toHaveBeenCalledWith('test.stat', 2);
    });

    it('should call timing on StatsD client', () => {
        const metrics = Metrics.getInstance();
        metrics.timing('test.timing', 123);
        expect(statsdMock.timing).toHaveBeenCalledWith('test.timing', 123);
    });

    it('should call gauge on StatsD client', () => {
        const metrics = Metrics.getInstance();
        metrics.gauge('test.gauge', 42);
        expect(statsdMock.gauge).toHaveBeenCalledWith('test.gauge', 42, undefined, undefined);
    });

    it('should call histogram on StatsD client', () => {
        const metrics = Metrics.getInstance();
        metrics.histogram('test.histogram', 7);
        expect(statsdMock.histogram).toHaveBeenCalledWith('test.histogram', 7);
    });

    it('should close and reset client on flush', () => {
        const metrics = Metrics.getInstance();
        metrics.flush();
        expect(statsdMock.close).toHaveBeenCalled();
        expect((Metrics as any).instance).toBeNull();
    });

    it('should not throw if flush is called with no client', () => {
        const metrics = Metrics.getInstance();
        (metrics as any).client = null;
        expect(() => metrics.flush()).not.toThrow();
    });

    it('should not call increment/timing/gauge/histogram if no socket', () => {
        statsdMock.socket = false;
        const metrics = Metrics.getInstance();
        metrics.increment('a');
        metrics.timing('b', 1);
        metrics.gauge('c', 2);
        metrics.histogram('d', 3);
        expect(statsdMock.increment).not.toHaveBeenCalled();
        expect(statsdMock.timing).not.toHaveBeenCalled();
        expect(statsdMock.gauge).not.toHaveBeenCalled();
        expect(statsdMock.histogram).not.toHaveBeenCalled();
    });

    it('should map ES status correctly', () => {
        const metrics = Metrics.getInstance();
        expect(metrics.mapEsStatus('green')).toBe(0);
        expect(metrics.mapEsStatus('yellow')).toBe(1);
        expect(metrics.mapEsStatus('red')).toBe(2);
        expect(metrics.mapEsStatus('other')).toBe(-1);
    });
});

describe('withMetrics', () => {
    beforeEach(() => {
        (Metrics as any).instance = null;
        jest.clearAllMocks();
    });

    it('should call increment, timing, flush, and return result', async () => {
        const metrics = Metrics.getInstance();
        const spyIncrement = jest.spyOn(metrics, 'increment');
        const spyTiming = jest.spyOn(metrics, 'timing');
        const spyFlush = jest.spyOn(metrics, 'flush');

        const fn = jest.fn().mockResolvedValue('ok');
        const result = await withMetrics('my.key', {}, fn);

        expect(spyIncrement).toHaveBeenCalledWith('my.key.invoked');
        expect(spyTiming).toHaveBeenCalledWith(expect.stringContaining('my.key.execution_time_ms'), expect.any(Number));
        expect(spyFlush).toHaveBeenCalled();
        expect(result).toBe('ok');
    });

    it('should flush even if fn throws', async () => {
        const metrics = Metrics.getInstance();
        const spyFlush = jest.spyOn(metrics, 'flush');
        const fn = jest.fn().mockRejectedValue(new Error('fail'));
        await expect(withMetrics('fail.key', {}, fn)).rejects.toThrow('fail');
        expect(spyFlush).toHaveBeenCalled();
    });
});