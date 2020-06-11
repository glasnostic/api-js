import { isNil, cloneDeep } from 'lodash';

import { MetricTypes } from './metric-types';
import { Policy, Policies } from './policies';

export type PolicyHistory = {
    [m in MetricTypes]?: Array<Policy>;
};

export namespace PolicyHistory {
    export const getLatestPolicy = (
        history: PolicyHistory,
        type: MetricTypes
    ): Policy | undefined => {
        const policy = history[type];
        if (!policy) {
            return undefined;
        }
        return policy.find((p) => isNil(p.deletedAt));
    };
    export const activePolicies = (history: PolicyHistory): Policies => {
        const policies: Policies = {};
        for (const t of MetricTypes.types) {
            const p = PolicyHistory.getLatestPolicy(history, t);
            if (p) {
                policies[t] = cloneDeep(p);
            }
        }
        return policies;
    };
}
