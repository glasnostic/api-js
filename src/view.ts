import { PolicyHistory } from './policy-history';

export interface View {
    clients: string;
    services: string;
    name?: string;
    id?: string;
    index?: string;
    policyHistory?: PolicyHistory;
    handlers?: any[];
    createdAt?: string;
    deletedAt?: string;
    modifiedAt?: string;
    committedAt?: string;
    commitId?: string;
}
