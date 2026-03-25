// Vitest setup: Chrome API mocks for extension tests

import '@testing-library/jest-dom';
import { vi } from 'vitest';

const mockTabs = {
  create: vi.fn().mockResolvedValue({ id: 1, url: 'https://example.com' }),
  query: vi.fn().mockResolvedValue([]),
};

const mockRuntime = {
  sendMessage: vi.fn().mockResolvedValue({}),
  onMessage: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
  onInstalled: {
    addListener: vi.fn(),
  },
  onStartup: {
    addListener: vi.fn(),
  },
  lastError: null as chrome.runtime.LastError | null,
};

const mockStorageSession = {
  get: vi.fn().mockResolvedValue({}),
  set: vi.fn().mockResolvedValue(undefined),
};

const mockStorageLocal = {
  get: vi.fn().mockResolvedValue({}),
  set: vi.fn().mockResolvedValue(undefined),
};

const mockContextMenus = {
  create: vi.fn().mockResolvedValue(undefined),
  removeAll: vi.fn().mockResolvedValue(undefined),
  onClicked: {
    addListener: vi.fn(),
  },
};

const mockAction = {
  setBadgeText: vi.fn().mockResolvedValue(undefined),
  setBadgeBackgroundColor: vi.fn().mockResolvedValue(undefined),
};

global.chrome = {
  tabs: mockTabs,
  runtime: mockRuntime,
  storage: {
    session: mockStorageSession,
    local: mockStorageLocal,
  },
  contextMenus: mockContextMenus,
  action: mockAction,
} as unknown as typeof chrome;

// Reset all mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
  mockTabs.create.mockResolvedValue({ id: 1, url: 'https://example.com' });
  mockTabs.query.mockResolvedValue([]);
  mockRuntime.sendMessage.mockResolvedValue({});
  mockStorageSession.get.mockResolvedValue({});
  mockStorageSession.set.mockResolvedValue(undefined);
  mockStorageLocal.get.mockResolvedValue({});
  mockStorageLocal.set.mockResolvedValue(undefined);
  mockContextMenus.create.mockResolvedValue(undefined);
  mockContextMenus.removeAll.mockResolvedValue(undefined);
  mockRuntime.lastError = null;
});
