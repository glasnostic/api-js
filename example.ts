import { GlasnosticConsole, GlasnosticView } from './glasnostic-api';

const isViewEqual = (a: GlasnosticView, b: GlasnosticView): boolean => {
  return a.clients === b.clients
      && a.services === b.services
      && a.name === b.name
      && a.id === b.id
};

(async () => {
  const api = new GlasnosticConsole({
    // use the same credentials that you are using to sign in to https://glasnostic.com/signin
    username: 'testuser',
    password: 'changeme'
  });
  const { username } = await api.login();
  console.log(`logged as ${username}`);
  const environments = await api.getEnvironments();
  console.log('environment keys:', environments.map(e => e.key));
  const view = await api.createView(environments[1].key, 'My Channel', 'clients*', 'services*', {requests: {policyValue: 10000}});
  console.log('created view:', view);
  if (view.id) {
    console.log('fetch view', view.id, 'again.');
    const view2 = await api.getView(environments[1].key, view.id);
    if (view2) {
      console.log('view is', (isViewEqual(view, view2) ? '' : 'not ') + 'equal.');
    } else {
      console.error('fail to fetch view', view.id);
    }
  } else {
    console.error('view has no id');
  }
})();
