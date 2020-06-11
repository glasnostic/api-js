const { GlasnosticConsole } = require('../dist/glasnostic-api');

(async () => {
    const api = new GlasnosticConsole({
        // use the same credentials that you are using to sign in to https://glasnostic.com/signin
        username: 'testuser',
        password: 'changeme',
    });
    const { username } = await api.login();
    console.log(`logged as ${username}`);
    const environments = await api.getEnvironments();
    console.log(
        'environment keys:',
        environments.map((e) => e.key)
    );
    const view = await api.createView(environments[1].key, 'My Channel', 'clients*', 'services*', {
        requests: { policyValue: 10000 },
    });
    console.log('created view:', view);
    const updatedView = await api.updateView(
        environments[1].key,
        view.id,
        'Updated Name',
        undefined,
        undefined,
        undefined
    );
    console.log('updated view:', updatedView);
})();
