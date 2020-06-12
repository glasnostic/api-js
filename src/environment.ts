export interface Environment {
    id: string;
    key: string;
    switch: boolean;
    userId: string;
    name: string;
    description: string;
    simulator?: string;
    createdAt: Date | string;
    modifiedAt: Date | string;
    deletedAt: Date | string;
    clusters: any;
}
