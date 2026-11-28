import { useState } from "react";
import { api, errorText } from "./api";

export function useUpload(url) {
  const [state, setState] = useState({ busy: false, progress: 0, error: "" });

  async function send(file, fields) {
    const form = new FormData();
    form.append("file", file);
    for (const [key, value] of Object.entries(fields)) form.append(key, value);
    setState({ busy: true, progress: 0, error: "" });
    try {
      const response = await api.post(url, form, {
        onUploadProgress: (event) => {
          if (event.total) setState((s) => ({ ...s, progress: Math.round((event.loaded / event.total) * 100) }));
        },
      });
      setState({ busy: false, progress: 100, error: "" });
      return response.data;
    } catch (failure) {
      setState({ busy: false, progress: 0, error: errorText(failure) });
      return null;
    }
  }

  return { ...state, send, clearError: () => setState((s) => ({ ...s, error: "" })) };
}
