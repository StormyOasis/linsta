/* eslint-disable @typescript-eslint/no-explicit-any */
import { Metrics } from '../Metrics';
import config from '../../config';

jest.mock('hot-shots');
jest.mock('../../config', () => ({
    metrics: {
        statsd: {
            host: 'localhost',
            port: 8125
        }
    }
}));
jest.mock('../../logger/logger');

describe('Metrics', () => {
    afterEach(() => {
        // Reset singleton for isolation
        (Metrics as any).instance = null;
    });

    it('returns the same instance (singleton)', () => {
        const instance1 = Metrics.getInstance();
        const instance2 = Metrics.getInstance();
        expect(instance1).toBe(instance2);
    });

    it('creates a new instance if none exists', () => {
        (Metrics as any).instance = null;
        const instance = Metrics.getInstance();
        expect(instance).toBeInstanceOf(Metrics);
    });

    it('mapEsStatus returns correct values', () => {
        const metrics = Metrics.getInstance();
        expect(metrics.mapEsStatus('green')).toBe(0);
        expect(metrics.mapEsStatus('yellow')).toBe(1);
        expect(metrics.mapEsStatus('red')).toBe(2);
        expect(metrics.mapEsStatus('unknown')).toBe(-1);
        expect(metrics.mapEsStatus('')).toBe(-1);
    });
});