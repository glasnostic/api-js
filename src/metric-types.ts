export type MetricTypes = 'requests' | 'latency' | 'concurrency' | 'bandwidth';

export namespace MetricTypes {
    export const types: MetricTypes[] = ['requests', 'latency', 'concurrency', 'bandwidth'];
    export const index: {
        [m in MetricTypes]: number;
    } = { requests: 0, latency: 1, concurrency: 2, bandwidth: 3 };
}
