// Unit tests for utils/tabs-source.ts: junk filters and the lookup

import { resolveTabs, toTabRecord } from '@/utils/tabs-source';
import { chromeTab } from '@tests/helpers/chrome-tabs';
import { describe, expect, it } from 'vitest';

describe('toTabRecord', () => {
  it.each(['chrome://newtab/', 'chrome://new-tab-page/', 'about:blank'])(
    'returns null for the junk address %s',
    (url) => {
      expect(toTabRecord(chromeTab({ url }))).toBeNull();
    }
  );

  it.each([
    'file:///Users/a/notes.txt',
    'view-source:https://example.com/',
    'data:text/html,<p>x</p>',
    'javascript:void(0)',
    'devtools://devtools/bundled/inspector.html',
  ])(
    'returns null for the blocked or unsupported scheme %s, so Open never searches for it',
    (url) => {
      expect(toTabRecord(chromeTab({ url }))).toBeNull();
    }
  );

  it.each(['chrome://settings/', 'chrome-extension://abc/popup/index.html', 'ftp://old.example/f'])(
    'keeps the address %s',
    (url) => {
      expect(toTabRecord(chromeTab({ url }))?.url).toBe(url);
    }
  );

  it('returns null for a tab with an empty url and an empty pendingUrl', () => {
    expect(toTabRecord(chromeTab({ url: '', pendingUrl: '' }))).toBeNull();
    expect(toTabRecord(chromeTab({ url: undefined, pendingUrl: undefined }))).toBeNull();
  });

  it('returns null for a loading tab whose pendingUrl is junk', () => {
    expect(toTabRecord(chromeTab({ url: '', pendingUrl: 'about:blank' }))).toBeNull();
  });

  it('uses pendingUrl when url is empty (Review Focus 3)', () => {
    const record = toTabRecord(
      chromeTab({ url: '', pendingUrl: 'https://loading.example/page', title: undefined })
    );
    expect(record?.url).toBe('https://loading.example/page');
    expect(record?.title).toBe('https://loading.example/page');
  });

  it('prefers url over pendingUrl', () => {
    const record = toTabRecord(chromeTab({ url: 'https://a.com/', pendingUrl: 'https://b.com/' }));
    expect(record?.url).toBe('https://a.com/');
  });

  it('uses the URL as the title when the title is undefined or empty', () => {
    expect(toTabRecord(chromeTab({ title: undefined }))?.title).toBe('https://example.com/');
    expect(toTabRecord(chromeTab({ title: '' }))?.title).toBe('https://example.com/');
  });

  it('keeps pinned tabs and copies the position fields', () => {
    expect(
      toTabRecord(chromeTab({ pinned: true, active: true, index: 4, windowId: 7, groupId: 3 }))
    ).toEqual({
      title: 'Page',
      url: 'https://example.com/',
      windowId: 7,
      index: 4,
      pinned: true,
      active: true,
      groupId: 3,
    });
  });

  it('copies favIconUrl and lastAccessed only when present', () => {
    const bare = toTabRecord(chromeTab());
    expect(bare).not.toHaveProperty('favIconUrl');
    expect(bare).not.toHaveProperty('lastAccessed');
    const full = toTabRecord(
      chromeTab({ favIconUrl: 'https://example.com/i.png', lastAccessed: 99 })
    );
    expect(full?.favIconUrl).toBe('https://example.com/i.png');
    expect(full?.lastAccessed).toBe(99);
  });

  it('keeps a discarded tab', () => {
    expect(toTabRecord(chromeTab({ discarded: true }))?.url).toBe('https://example.com/');
  });

  it('returns null for a tab whose data fails the schema', () => {
    expect(toTabRecord(chromeTab({ index: 1.5 }))).toBeNull();
  });
});

describe('resolveTabs', () => {
  const known = [
    toTabRecord(chromeTab({ title: 'First', url: 'https://a.com/p_(q)', index: 0 })),
    toTabRecord(chromeTab({ title: 'Second', url: 'https://a.com/p_(q)', index: 1 })),
    toTabRecord(chromeTab({ title: 'Other', url: 'https://b.com/', index: 2, windowId: 2 })),
  ].flatMap((record) => (record === null ? [] : [record]));

  it('matches a URL to the first known tab by urlKey', () => {
    const [group] = resolveTabs([['https://a.com/p_%28q%29']], known);
    expect(group?.[0]?.title).toBe('First');
  });

  it('finds an http tab of a website by the https address that the parser gives, and keeps the tab address and title', () => {
    const http = toTabRecord(chromeTab({ title: 'Site', url: 'http://a.com/x' }));
    const [group] = resolveTabs([['https://a.com/x']], http === null ? [] : [http]);
    expect(group?.[0]).toMatchObject({ title: 'Site', url: 'http://a.com/x' });
  });

  it('finds a local http tab by its own http address', () => {
    const http = toTabRecord(chromeTab({ title: 'Local', url: 'http://127.0.0.1:8080/a.html' }));
    const [group] = resolveTabs([['http://127.0.0.1:8080/a.html']], http === null ? [] : [http]);
    expect(group?.[0]).toMatchObject({ title: 'Local', url: 'http://127.0.0.1:8080/a.html' });
  });

  it('keeps tab data of the match (window and position)', () => {
    expect(resolveTabs([['https://b.com']], known)[0]?.[0]).toEqual(known[2]);
  });

  it('builds a plain record for an unmatched URL', () => {
    expect(resolveTabs([['https://new.com/x']], known)).toEqual([
      [
        {
          title: 'https://new.com/x',
          url: 'https://new.com/x',
          windowId: 0,
          index: 0,
          pinned: false,
          active: false,
          groupId: -1,
        },
      ],
    ]);
  });

  it('keeps the group structure, including empty groups', () => {
    const groups = resolveTabs([['https://b.com/'], [], ['https://c.com/']], known);
    expect(groups.map((group) => group.length)).toEqual([1, 0, 1]);
  });
});
