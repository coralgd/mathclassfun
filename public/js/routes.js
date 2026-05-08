const isGitHubPages = location.hostname.endsWith('github.io');
const basePath = isGitHubPages
  ? location.pathname.split('/').slice(0, 2).join('/')
  : '';

export function pageUrl(page) {
  const clean = page.replace(/^\//, '');
  return `${basePath}/${clean}.html`;
}

export function go(page) {
  location.assign(pageUrl(page));
}
