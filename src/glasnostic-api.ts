import { CookieJar } from 'tough-cookie';
import { default as got } from 'got';
import { isNil } from 'lodash';
import { PolicyHistory } from './policy-history';
import { Policies } from './policies';
import { GlasnosticView } from './view';
import { GlasnosticEnvironment } from './environment';

export * from './policies';
export * from './metric-types';
export * from './policy-history';
export * from './view';
export * from './environment';

const defaultBaseDomain = 'https://glasnostic.com';

enum GlasnosticCommitAction {
    create = 1,
    update = 2,
    delete = 3,
}

interface GlasnosticViewSnapshot {
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

    async getEnvironments(): Promise<GlasnosticEnvironment[]> {
        if (this.loginStatus === null) {
            throw new Error('you are not logged in');
        }
        const environmentUrl = new URL('/api/assemblies/user', this.apiDomain);
        return await got
            .get(environmentUrl, { cookieJar: this.cookieJar })
            .json<GlasnosticEnvironment[]>();
    }

    async getView(environmentKey: string, viewId: string): Promise<GlasnosticView | false> {
        const channels = await this.getViews(environmentKey);
        return channels.find((ch) => ch.id === viewId) || false;
    }

    async getViews(environmentKey: string): Promise<GlasnosticView[]> {
        const listUrl = new URL('/api/channels', this.apiDomain);
        listUrl.searchParams.set('assemblyKey', environmentKey);
        const { channels } = await got
            .get(listUrl, { cookieJar: this.cookieJar })
            .json<{ channels: GlasnosticView[] }>();
        return channels;
    }

    async createView(
        environmentKey: string,
        name: string,
        source: string,
        destination: string,
        policies?: Policies
    ): Promise<GlasnosticView> {
        const view: GlasnosticViewSnapshot = {
            clients: source,
            services: destination,
            name,
            policies,
        };
        return await this.commitView(environmentKey, GlasnosticCommitAction.create, view);
    }

    async updateView(
        environmentKey: string,
        viewId: string,
        name: string | undefined,
        source: string | undefined,
        destination: string | undefined,
        policies: Policies | undefined
    ): Promise<GlasnosticView> {
        const originalView = await this.getView(environmentKey, viewId);
        if (!originalView) {
            throw new Error('view not found');
        }
        const view: GlasnosticViewSnapshot = {
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

        return await this.commitView(environmentKey, GlasnosticCommitAction.update, view);
    }

    async deleteView(environmentKey: string, viewId: string): Promise<void> {
        const originalView = await this.getView(environmentKey, viewId);
        if (!originalView) {
            throw new Error('view not found');
        }
        return await this.commitView(environmentKey, GlasnosticCommitAction.delete, originalView);
    }

    private async commitView(
        environmentKey: string,
        action: GlasnosticCommitAction.delete,
        view: GlasnosticViewSnapshot
    ): Promise<void>;
    private async commitView(
        environmentKey: string,
        action: GlasnosticCommitAction,
        view: GlasnosticViewSnapshot
    ): Promise<GlasnosticView>;
    private async commitView(
        environmentKey: string,
        action: GlasnosticCommitAction,
        view: GlasnosticViewSnapshot
    ): Promise<GlasnosticView | void> {
        interface CommitPayload {
            assemblyKey: string;
            action: GlasnosticCommitAction;
            channel: Partial<GlasnosticView>;
            lastCommitId?: string;
        }

        const commitUrl = new URL('/api/channels/commit', this.apiDomain);
        const payload: CommitPayload = {
            assemblyKey: environmentKey,
            action,
            channel: view,
        };
        if (action === GlasnosticCommitAction.delete) {
            payload.channel = { id: view.id };
            payload.lastCommitId = view.commitId;
        }
        if (action === GlasnosticCommitAction.update) {
            payload.lastCommitId = view.commitId;
        }
        const option = {
            cookieJar: this.cookieJar,
            json: payload,
        };

        const resultView = await got.post(commitUrl, option).json<GlasnosticView>();
        return action === GlasnosticCommitAction.delete ? undefined : resultView;
    }
}
