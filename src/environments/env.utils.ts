function getDomainFromHost(appHost: string): string {
  const whitelistedDomain = DOMAINS.find(
    d => appHost.endsWith(d) || (d === 'localhost' && origin.includes('localhost'))
  );

  if (!whitelistedDomain) {
    console.warn('Failed to find provided domain for host, app may fail to load', {
      host: appHost,
    });
    return appHost;
  }
  return whitelistedDomain;
}

const DOMAINS: string[] = [
  'mypurecloud.com',
  'mypurecloud.com.au',
  'mypurecloud.jp',
  'mypurecloud.de',
  'mypurecloud.ie',
  'usw2.pure.cloud',
  'cac1.pure.cloud',
  'euw2.pure.cloud',
  'apne2.pure.cloud',
  'aps1.pure.cloud',
  'inintca.com',
  'inindca.com',
  'localhost',
];

declare var __CDN_URL__: string;
export const deployUrl: string = __CDN_URL__;

export const origin = window.location.origin;

export const host = window.location.host;

export const domain = getDomainFromHost(host);

export const clientId = '64cd7f8c-207b-4caf-b888-56b8e17384a6';

export const availableTranslations = [
  'cs',
  'da',
  'de',
  'en-us',
  'es',
  'fi',
  'fr',
  'it',
  'ja',
  'ko',
  'nl',
  'no',
  'pl',
  'pt-br',
  'sv',
  'th',
  'tr',
  'zh-cn',
  'zh-tw',
];
