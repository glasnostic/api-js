import { CookieJar } from 'tough-cookie';
import { default as got } from 'got';
import { isNil } from 'lodash';

let glasnosticBaseDomain = 'https://glasnostic.com';

export interface LoginStatus {
  username: string;
}

export interface GlasnosticEnvironment {
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

export enum GlasnosticCommitAction {
  create = 1,
  update = 2,
  delete = 3
}

export interface GlasnosticView {
  clients: string;
  services: string;
  name?: string;
  id?: string;
  index?: string;
  policies?: Policies;
  policyHistory?: any;
  handlers?: any[];
  createdAt?: string;
  deletedAt?: string;
  modifiedAt?: string;
  committedAt?: string;
  commitId?: string;
}

export interface MetricPolicy {
  createdAt?: string;
  policyValue: number;
  deletedAt?: string;
}

type MetricTypesName = 'requests' | 'latency' | 'concurrency' | 'bandwidth';
export type Policies = {
  [m in MetricTypesName]?: MetricPolicy;
};

export class GlasnosticConsole {
  private cookieJar = new CookieJar();

  baseDomain = new URL(glasnosticBaseDomain);
  apiDomain: URL;
  username = '';
  password = '';
  loginStatus:  LoginStatus | null = null;

  constructor({username, password, baseDomain}: {username?: string, password?: string, baseDomain?: string}) {
    if (!isNil(baseDomain)) {
      this.baseDomain = new URL(baseDomain);
    }
    if (!isNil(username) && !isNil(password)) {
      this.username = username;
      this.password = password;
    };
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
      followRedirect: false
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
      const message = JSON.parse(jwtMessage) as {msg: { type: string, text: string}};
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
    return await got.get(environmentUrl, { cookieJar: this.cookieJar }).json<GlasnosticEnvironment[]>();
  }

  async createView(environmentKey: string, name: string, source: string, destination: string, policies?: Policies): Promise<GlasnosticView> {
    const view: GlasnosticView = {
      clients: source,
      services: destination,
      name,
      policies,
    };
    return await this.commitView(environmentKey, GlasnosticCommitAction.create, view);
  }

  async getView(environmentKey: string, viewId: string): Promise<GlasnosticView | false> {
    const channels = await this.getViews(environmentKey);
    return channels.find(ch => ch.id === viewId) || false;
  }

  async getViews(environmentKey: string): Promise<GlasnosticView[]> {
    const listUrl = new URL('/api/channels', this.apiDomain);
    listUrl.searchParams.set('assemblyKey', environmentKey);
    const { channels } = await got.get(listUrl, { cookieJar: this.cookieJar }).json<{channels: GlasnosticView[]}>();
    return channels;
  }

  async deleteView(environmentKey: string, viewId: string): Promise<void> {
    const originalView = await this.getView(environmentKey, viewId);
    if (!originalView) {
      throw new Error('view not found');
    }
    return await this.commitView(environmentKey, GlasnosticCommitAction.delete, originalView);
  }

  private async commitView(environmentKey: string, action: GlasnosticCommitAction.delete, view: GlasnosticView): Promise<void>;
  private async commitView(environmentKey: string, action: GlasnosticCommitAction, view: GlasnosticView): Promise<GlasnosticView>;
  private async commitView(environmentKey: string, action: GlasnosticCommitAction, view: GlasnosticView): Promise<GlasnosticView | void> {
    const commitUrl = new URL('/api/channels/commit', this.apiDomain);
    const payload: {
      assemblyKey: string;
      action: GlasnosticCommitAction;
      channel: Partial<GlasnosticView>;
      lastCommitId?: string;
    } = {
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
    }
    const resultView = await got.post(commitUrl, option).json<GlasnosticView>();
    return action === GlasnosticCommitAction.delete ? undefined : resultView;
  }
}
