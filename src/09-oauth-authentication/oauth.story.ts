/**
 * 09 — OAuth 2.1 hardening, as a story that proves itself.
 *
 * These are the rules an authorization server gets wrong quietly. A redirect
 * check that is too generous, or a credential honoured across issuers, does
 * not fail a demo — it fails an audit. So they get assertions.
 */
import { story } from 'executable-stories-vitest';
import { describe, expect, it } from 'vitest';
import { isAllowedRedirect } from './provider';

describe('09 — OAuth 2.1, hardened', () => {
  it('lets a native client use loopback http, and refuses a web client the same', async ({
    task,
  }) => {
    story.init(task);
    story.section({
      title: 'Why application_type decides this',
      markdown: [
        'A native app has no https origin of its own, so SEP-837 lets it register',
        'a loopback http redirect. A web client has no such excuse: plain http',
        'means an authorization code crossing the network in the clear.',
        '',
        'Allowing http for everything is the easy mistake, and it looks identical',
        'in a demo. It differs only under attack.',
      ].join('\n'),
    });

    story.given('the redirect rule from the provider');

    const cases: Array<[string, string, boolean]> = [
      ['https://app.example.com/cb', 'web', true],
      ['https://app.example.com/cb', 'native', true],
      ['http://127.0.0.1:8765/cb', 'native', true],
      ['http://localhost:8765/cb', 'native', true],
      ['http://127.0.0.1:8765/cb', 'web', false],
      ['http://evil.example.com/cb', 'native', false],
      ['not-a-url', 'native', false],
    ];

    story.when('each candidate redirect is checked');
    const rows = cases.map(([uri, type, expected]) => {
      const actual = isAllowedRedirect(uri, type);
      expect(actual, `${type} ${uri}`).toBe(expected);
      return [uri, type, actual ? 'allowed' : 'refused'];
    });

    story.table({
      label: 'Redirect policy',
      columns: ['Redirect URI', 'application_type', 'Verdict'],
      rows,
    });

    story.then('loopback is a concession to native clients, not a general rule');
    expect(isAllowedRedirect('http://127.0.0.1:1/cb', 'web')).toBe(false);

    story.and('a non-loopback http redirect is refused even for a native client');
    expect(isAllowedRedirect('http://evil.example.com/cb', 'native')).toBe(false);
  });

  it('treats a malformed redirect as refused rather than throwing', async ({ task }) => {
    story.init(task);
    story.section({
      title: 'Fail closed',
      markdown: [
        'An unparseable redirect is a refusal, not an exception. A throw here',
        'would surface as a 500 and tell an attacker they found an edge the',
        'server did not expect.',
      ].join('\n'),
    });

    story.given('a redirect that is not a URL at all');
    story.when('it is checked');
    story.then('the answer is a plain no');
    expect(isAllowedRedirect('%%%', 'native')).toBe(false);
    expect(isAllowedRedirect('', 'web')).toBe(false);
  });
});
