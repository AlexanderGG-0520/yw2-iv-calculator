import type { SearchInput, SearchResponse } from "../engine/types";

type WorkerResponse =
  | { ok: true; response: SearchResponse }
  | { ok: false; error: string };

function abortError(signal?: AbortSignal): Error {
  if (signal?.reason instanceof Error) return signal.reason;
  return new DOMException("Reverse search was cancelled.", "AbortError");
}

export function runReverseSearchInBrowserWorker(
  input: SearchInput,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  if (signal?.aborted) {
    return Promise.reject(abortError(signal));
  }

  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("../workers/reverseSearch.worker.ts", import.meta.url),
      { type: "module" },
    );
    let settled = false;

    const cleanup = () => {
      signal?.removeEventListener("abort", onAbort);
      worker.terminate();
    };

    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback();
    };

    const onAbort = () => {
      finish(() => reject(abortError(signal)));
    };

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data;
      if (message.ok) {
        const response = message.response;
        finish(() => resolve(response));
      } else {
        const error = message.error;
        finish(() => reject(new Error(error)));
      }
    };

    worker.onerror = (event) => {
      finish(() =>
        reject(new Error(event.message || "逆算ワーカーでエラーが発生しました。")),
      );
    };

    signal?.addEventListener("abort", onAbort, { once: true });
    worker.postMessage(input);
  });
}
