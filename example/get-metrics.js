const { GlasnosticConsole } = require('../dist/glasnostic-api');

(async () => {
    const api = new GlasnosticConsole({
        // use the same credentials that you are using to sign in to https://glasnostic.com/signin
        username: 'testuser',
        password: 'changeme',
    });
    const { username } = await api.login();
    console.log(`logged in as ${username}`);
    const environments = await api.getEnvironments();

    // create a view that is capturing the traffic
    const view = await api.createView(environments[0].key, 'My Channel', 'source', 'destination');
    console.log('created view:', view);
    // send metric data to the first network in the first environment
    const networkId = environments[0].clusters[0].key;
    const metric = [{
        "route": {
            "source": {"name": "source", "instance": "0"},
            "destination": {"name": "destination", "instance": "1"}
        },
        "metric": {
            "bandwidth": 1,
            "connections": 2,
            "concurrency": 3,
            "latency": 4
        }
    }];
    await api.sendMetric(networkId, new Date(), metric);
    console.log('metric sent.');
    // gets data from the last minute (=60000 milliseconds) in 10s samples (=10000 milliseconds)
    const metrics = await api.getViewMetrics(environments[0].key, view.index,10000, 60000);
    console.log('initial metrics:', metrics);
    // send 2nd metric
    await api.sendMetric(environments[0].clusters[0].key, new Date(), metric);
    console.log('2nd metric sent.');
    // get 30s of metrics after the last time getViewMetrics was called
    const incrementalMetrics = await api.getViewMetrics(environments[0].key, view.index,10000, 30000, metrics.window.start);
    console.log('metrics update:', incrementalMetrics);
})();