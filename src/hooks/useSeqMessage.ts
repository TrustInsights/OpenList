// Hook that holds one status message with a counter, so a repeated message still counts as new

import { useCallback, useState } from 'react';

/** A message, its counter, and the setter. */
interface SeqMessage {
  text: string;
  /** Goes up on every write, so a repeated message still counts as a new result. */
  seq: number;
  setMessage: (message: string) => void;
}

/**
 * Holds one message and a counter that goes up on every write.
 * @returns The message, the counter, and a stable setter.
 */
export function useSeqMessage(): SeqMessage {
  const [{ text, seq }, setState] = useState({ text: '', seq: 0 });
  const setMessage = useCallback((message: string): void => {
    setState((previous) => ({ text: message, seq: previous.seq + 1 }));
  }, []);
  return { text, seq, setMessage };
}
