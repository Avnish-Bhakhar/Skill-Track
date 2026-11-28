import { useCallback, useEffect, useState } from "react";
import { api, errorText } from "./api";

export function useData(url, params) {
  const [state, setState] = useState({ data: null, error: "", loading: true });
  const [version, setVersion] = useState(0);
  const key = JSON.stringify(params ?? {});

  useEffect(() => {
    const controller = new AbortController();
    setState((previous) => ({ ...previous, error: "", loading: true }));
    api
      .get(url, { params: JSON.parse(key), signal: controller.signal })
      .then((response) => setState({ data: response.data, error: "", loading: false }))
      .catch((error) => {
        if (!controller.signal.aborted) setState({ data: null, error: errorText(error), loading: false });
      });
    return () => controller.abort();
  }, [url, key, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { ...state, reload };
}
