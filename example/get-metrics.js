const { GlasnosticConsole } = require('../dist/glasnostic-api');

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

(async () => {
    const api = new GlasnosticConsole({
        // use the same credentials that you are using to sign in to https://glasnostic.com/signin
        username: 'testuser',
        password: 'changeme',
    });
    const { username } = await api.login();
    console.log(`logged in as ${username}`);
    const environments = await api.getEnvironments();
    console.log('environments:', environments);
    // note: make sure to pick an environment that is actually storing data - demo environments are not storing any samples
    // gets data from the last minute (=60000 milliseconds) in 10s samples (=10000 milliseconds)
    const metrics = await api.getMetrics(environments[0].key, 10000, 60000);
    console.log('initial metrics:', metrics);
    // wait for 10s
    console.log('waiting for 10s');
    await sleep(10000);
    // get 10s of metrics after the last time getMetrics was called
    const incrementalMetrics = await api.getMetrics(environments[0].key, 10000, 10000, metrics.window.start);
    console.log('metrics update:', incrementalMetrics);
})();