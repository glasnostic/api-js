import { CookieJar } from 'tough-cookie';
import { default as got } from 'got';
import { isNil } from 'lodash';
import { PolicyHistory } from './policy-history';
import { Policies } from './policies';
import { View } from './view';
import { Environment } from './environment';
import { MetricsResponse } from './metrics';

export * from './policies';
export * from './metric-types';
export * from './policy-history';
export * from './view';
export * from './environment';
export * from './metrics';

const defaultBaseDomain = 'https://glasnostic.com';

enum CommitAction {
    create = 1,
    update = 2,
    delete = 3,
}

interface ViewSnapshot {
    clients: string;
    services: string;
    name?: string;
    id?: string;
    policies?: Policies;
    handlers?: any[];
    commitId?: string;
}

export interface LoginStatus {
    username: string;
}

export class GlasnosticConsole {
    private cookieJar = new CookieJar();

    baseDomain = new URL(defaultBaseDomain);
    apiDomain: URL;
    username = '';
    password = '';
    loginStatus: LoginStatus | null = null;

    constructor({
        username,
        password,
        baseDomain,
    }: {
        username: string;
        password: string;
        baseDomain?: string;
    }) {
        if (!isNil(baseDomain)) {
            this.baseDomain = new URL(baseDomain);
        }
        if (!isNil(username) && !isNil(password)) {
            this.username = username;
            this.password = password;
        }
        this.apiDomain = new URL('', this.baseDomain);
        this.apiDomain.host = `app.${this.apiDomain.host}`;
    }

    async login(): Promise<LoginStatus> {
        const username = this.username;
        const password = this.password;

        const loginUrl = new URL('/auth/email/login', this.baseDomain);
        const gotOption = {
            form: { loginid: username, password },
            cookieJar: this.cookieJar,
            followRedirect: false,
        };

        const res = await got.post(loginUrl, gotOption);
        if (isNil(res.headers.location)) {
            throw new Error('invalid response: missing header "location"');
        }

        const location = new URL(res.headers.location);
        if (!location.hostname.startsWith('app')) {
            const jwt = location.searchParams.get('jwt');
            if (isNil(jwt)) {
                throw new Error('invalid response: missing search param "jwt"');
            }

            const jwtMessage = Buffer.from(jwt.split('.')[1], 'base64').toString('utf8');
            const message = JSON.parse(jwtMessage) as { msg: { type: string; text: string } };
            throw new Error(message.msg.text);
        }

        this.loginStatus = { username };
        return this.loginStatus;
    }

    async getEnvironments(): Promise<Environment[]> {
        if (this.loginStatus === null) {
            throw new Error('you are not logged in');
        }
        const environmentUrl = new URL('/api/assemblies/user', this.apiDomain);
        return await got.get(environmentUrl, { cookieJar: this.cookieJar }).json<Environment[]>();
    }

    async getView(environmentKey: string, viewIndex: string): Promise<View | false> {
        const views = await this.getViews(environmentKey);
        return views.find((ch) => ch.index === viewIndex) || false;
    }

    async getViews(environmentKey: string): Promise<View[]> {
        const listUrl = new URL('/api/channels', this.apiDomain);
        listUrl.searchParams.set('assemblyKey', environmentKey);
        const { channels: views } = await got
            .get(listUrl, { cookieJar: this.cookieJar })
            .json<{ channels: View[] }>();
        return views;
    }

    async createView(
        environmentKey: string,
        name: string,
        source: string,
        destination: string,
        policies?: Policies
    ): Promise<View> {
        const view: ViewSnapshot = {
            clients: source,
            services: destination,
            name,
            policies,
        };
        return await this.commitView(environmentKey, CommitAction.create, view);
    }

    async updateView(
        environmentKey: string,
        viewIndex: string,
        name: string | undefined,
        source: string | undefined,
        destination: string | undefined,
        policies: Policies | undefined
    ): Promise<View> {
        const originalView = await this.getView(environmentKey, viewIndex);
        if (!originalView) {
            throw new Error('view not found');
        }
        const view: ViewSnapshot = {
            id: originalView.id,
            name: originalView.name,
            clients: originalView.clients,
            services: originalView.services,
            handlers: originalView.handlers,
            policies: originalView.policyHistory
                ? PolicyHistory.activePolicies(originalView.policyHistory)
                : {},
            commitId: originalView.commitId,
        };

        if (!isNil(name)) {
            view.name = name;
        }
        if (!isNil(source)) {
            view.clients = source;
        }
        if (!isNil(destination)) {
            view.services = destination;
        }
        if (!isNil(policies)) {
            view.policies = policies;
        }

        return await this.commitView(environmentKey, CommitAction.update, view);
    }

    async deleteView(environmentKey: string, viewIndex: string): Promise<void> {
        const originalView = await this.getView(environmentKey, viewIndex);
        if (!originalView) {
            throw new Error('view not found');
        }
        return await this.commitView(environmentKey, CommitAction.delete, originalView);
    }

    private async commitView(
        environmentKey: string,
        action: CommitAction.delete,
        view: ViewSnapshot
    ): Promise<void>;
    private async commitView(
        environmentKey: string,
        action: CommitAction,
        view: ViewSnapshot
    ): Promise<View>;
    private async commitView(
        environmentKey: string,
        action: CommitAction,
        view: ViewSnapshot
    ): Promise<View | void> {
        interface CommitPayload {
            assemblyKey: string;
            action: CommitAction;
            channel: Partial<View>;
            lastCommitId?: string;
        }

        const commitUrl = new URL('/api/channels/commit', this.apiDomain);
        const payload: CommitPayload = {
            assemblyKey: environmentKey,
            action,
            channel: view,
        };
        if (action === CommitAction.delete) {
            payload.channel = { id: view.id };
            payload.lastCommitId = view.commitId;
        }
        if (action === CommitAction.update) {
            payload.lastCommitId = view.commitId;
        }
        const option = {
            cookieJar: this.cookieJar,
            json: payload,
        };

        const resultView = await got.post(commitUrl, option).json<View>();
        return action === CommitAction.delete ? undefined : resultView;
    }

    async getMetrics(
        environmentKey: string,
        samplePeriod?: number,
        duration?: number,
        start?: number
    ): Promise<MetricsResponse> {
        const metricsUrl = new URL('/api/metrics/assembly', this.apiDomain);
        metricsUrl.searchParams.set('key', environmentKey);
        if (!isNil(start)) {
            metricsUrl.searchParams.set('start', start + '');
        }
        if (!isNil(duration)) {
            metricsUrl.searchParams.set('duration', duration + '');
        }
        if (!isNil(samplePeriod)) {
            metricsUrl.searchParams.set('samplePeriod', samplePeriod + '');
        }

        return await got.get(metricsUrl, { cookieJar: this.cookieJar }).json<MetricsResponse>();
    }
}
