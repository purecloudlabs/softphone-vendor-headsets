import { host, origin, clientId, deployUrl, availableTranslations } from './env.utils';

const redirectUrl = 'https://localhost:1234/';

export const environment = {
  production: false,
  availableTranslations,
  host,
  origin,
  domain: 'inindca.com',
  clientId,
  apiHost: `https://api.inindca.com`,
  redirectUrl: `https://localhost:1234/`,
  deployUrl,
};
