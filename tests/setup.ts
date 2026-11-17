// Vitest setup: Chrome API mocks for extension tests

import '@testing-library/jest-dom';
import { type Mock, expect, vi } from 'vitest';
import * as matchers from 'vitest-axe/matchers';

expect.extend(matchers);

const mockTabs = {
  create: vi.fn().mockResolvedValue({ id: 1, url: 'https://example.com' }),
  query: vi.fn().mockResolvedValue([]),
};

const mockWindows = {
  getCurrent: vi.fn().mockResolvedValue({ id: 1, incognito: false }),
  getAll: vi.fn().mockResolvedValue([]),
};

const mockRuntime = {
  sendMessage: vi.fn().mockResolvedValue({}),
  getManifest: vi.fn(() => ({
    version: '1.1.0',
    action: { default_title: 'OpenList: open or copy a list of URLs' },
  })),
  getURL: vi.fn((path: string) => `chrome-extension://openlist/${path}`),
  onMessage: {
    addListener: vi.fn(),
  },
  onInstalled: {
    addListener: vi.fn(),
  },
  onStartup: {
    addListener: vi.fn(),
  },
  lastError: undefined as chrome.runtime.LastError | undefined,
};

const mockStorageSession = {
  get: vi.fn().mockResolvedValue({}),
  set: vi.fn().mockResolvedValue(undefined),
};

const mockStorageLocal = {
  get: vi.fn().mockResolvedValue({}),
  set: vi.fn().mockResolvedValue(undefined),
};

/** Callback-style create mock: calls the callback, returns an id. */
const makeCreateMock = (): Mock<(props: unknown, cb?: () => void) => string> =>
  vi.fn((_props: unknown, cb?: () => void) => {
    cb?.();
    return 'menu-id';
  });

/** Callback-style removeAll mock: calls the callback. */
const makeRemoveAllMock = (): Mock<(cb?: () => void) => void> =>
  vi.fn((cb?: () => void) => {
    cb?.();
  });

const mockPermissions = {
  onAdded: { addListener: vi.fn() },
  contains: vi.fn().mockResolvedValue(false),
  request: vi.fn().mockResolvedValue(false),
};

const mockOffscreen = {
  createDocument: vi.fn().mockResolvedValue(undefined),
  closeDocument: vi.fn().mockResolvedValue(undefined),
  Reason: { CLIPBOARD: 'CLIPBOARD' },
};

const mockAction = {
  setBadgeText: vi.fn().mockResolvedValue(undefined),
  setBadgeBackgroundColor: vi.fn().mockResolvedValue(undefined),
  setBadgeTextColor: vi.fn().mockResolvedValue(undefined),
  setTitle: vi.fn().mockResolvedValue(undefined),
};

const mockCommands = {
  onCommand: {
    addListener: vi.fn(),
  },
};

const mockContextMenus = {
  create: makeCreateMock(),
  removeAll: makeRemoveAllMock(),
  onClicked: {
    addListener: vi.fn(),
  },
};

global.chrome = {
  tabs: mockTabs,
  windows: mockWindows,
  runtime: mockRuntime,
  storage: {
    session: mockStorageSession,
    local: mockStorageLocal,
  },
  contextMenus: mockContextMenus,
  permissions: mockPermissions,
  offscreen: mockOffscreen,
  action: mockAction,
  commands: mockCommands,
} as unknown as typeof chrome;

// Reset all mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
  mockTabs.create.mockResolvedValue({ id: 1, url: 'https://example.com' });
  mockTabs.query.mockResolvedValue([]);
  mockWindows.getCurrent.mockResolvedValue({ id: 1, incognito: false });
  mockWindows.getAll.mockResolvedValue([]);
  mockRuntime.sendMessage.mockResolvedValue({});
  mockRuntime.getManifest.mockReturnValue({
    version: '1.1.0',
    action: { default_title: 'OpenList: open or copy a list of URLs' },
  });
  mockOffscreen.createDocument.mockResolvedValue(undefined);
  mockOffscreen.closeDocument.mockResolvedValue(undefined);
  mockAction.setBadgeText.mockResolvedValue(undefined);
  mockAction.setBadgeBackgroundColor.mockResolvedValue(undefined);
  mockAction.setBadgeTextColor.mockResolvedValue(undefined);
  mockAction.setTitle.mockResolvedValue(undefined);
  mockStorageSession.get.mockResolvedValue({});
  mockStorageSession.set.mockResolvedValue(undefined);
  mockStorageLocal.get.mockResolvedValue({});
  mockStorageLocal.set.mockResolvedValue(undefined);
  mockContextMenus.create = makeCreateMock();
  mockContextMenus.removeAll = makeRemoveAllMock();
  mockRuntime.lastError = undefined;
  mockPermissions.contains.mockResolvedValue(false);
  mockPermissions.request.mockResolvedValue(false);
});
