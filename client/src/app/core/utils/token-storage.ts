// "Remember me" decides WHERE a role's token lives, not how auth itself
// works: checked -> localStorage (survives closing the browser), unchecked
// -> sessionStorage (cleared when the tab/browser closes). Reads check both
// so callers (the auth interceptor, each service's bootstrap) never need to
// know which one a given login chose.
export function getStoredToken(key: string): string | null {
  return localStorage.getItem(key) ?? sessionStorage.getItem(key);
}

export function setStoredToken(key: string, token: string, remember: boolean) {
  if (remember) {
    localStorage.setItem(key, token);
    sessionStorage.removeItem(key);
  } else {
    sessionStorage.setItem(key, token);
    localStorage.removeItem(key);
  }
}

// For session refresh, where there's no explicit remember-me choice being
// made — just keep the token in whichever storage it already lived in.
export function replaceStoredToken(key: string, token: string) {
  if (localStorage.getItem(key) !== null) {
    localStorage.setItem(key, token);
  } else {
    sessionStorage.setItem(key, token);
  }
}

export function clearStoredToken(key: string) {
  localStorage.removeItem(key);
  sessionStorage.removeItem(key);
}
