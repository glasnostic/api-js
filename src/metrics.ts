import { MetricTypes } from './metric-types';

export type MetricsHistory = {
    [m in MetricTypes]: Array<number>;
}

export type MetricsRouteSpec = [string, string];

export interface MetricsRouteHistory {
    spec: MetricsRouteSpec;
    history: MetricsHistory;
}

export interface MetricsNode {
    name: string;
    instance?: string;
}

export interface MetricsNodeMap {
    [key: string]: MetricsNode;
}

export interface MetricsWindow {
    start: string;
    end: string;
    duration: number;
    sample_period: number;
    samples: number;
}

export interface MetricsResponse {
    routes?: Array<MetricsRouteHistory>;
    nodes?: MetricsNodeMap;
    window: MetricsWindow;
    version: number;
}
