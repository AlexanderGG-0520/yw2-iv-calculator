import { reverseSearch } from "../engine/reverseSearch";
import type { SearchInput } from "../engine/types";

self.onmessage = (event: MessageEvent<SearchInput>) => {
  try {
    self.postMessage({ ok: true, response: reverseSearch(event.data) });
  } catch (error) {
    self.postMessage({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
