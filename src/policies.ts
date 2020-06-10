import { MetricTypes } from './metric-types';

export interface Policy {
    createdAt?: string;
    policyValue: number;
    deletedAt?: string;
}

export type Policies = {
    [m in MetricTypes]?: Policy;
};

export namespace Policies {
    export const merge = (a: Policies, b: Policies) => {
        const policies: Policies = {};
        for (const t of MetricTypes.types) {
            const aPolicy = a[t];
            const bPolicy = b[t];
            if (bPolicy) {
                policies[t] = { policyValue: bPolicy.policyValue };
                continue;
            }
            if (aPolicy) {
                policies[t] = { policyValue: aPolicy.policyValue };
            }
        }
        return policies;
    };
}
