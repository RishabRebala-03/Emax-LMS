export const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://127.0.0.1:5000";

function getHeaders(customHeaders?: HeadersInit): Record<string, string> {
  const headers: Record<string, string> = {};
  const token = sessionStorage.getItem("sessionToken");
  if (token) {
    headers["X-Session-Token"] = token;
  }
  if (customHeaders) {
    if (customHeaders instanceof Headers) {
      customHeaders.forEach((value, key) => {
        headers[key] = value;
      });
    } else if (Array.isArray(customHeaders)) {
      customHeaders.forEach(([key, value]) => {
        headers[key] = value;
      });
    } else {
      Object.assign(headers, customHeaders);
    }
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = "Request failed";
    try {
      const body = await res.json();
      message = body.error || body.message || message;
    } catch {
      const text = await res.text().catch(() => "");
      message = text || message;
    }
    const error: any = new Error(message);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

export async function apiGet<T>(url: string, headers?: HeadersInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: getHeaders(headers),
  });
  return handleResponse<T>(res);
}

export async function apiPost<T>(url: string, body: any, headers?: HeadersInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    method: "POST",
    headers: getHeaders({ "Content-Type": "application/json", ...headers }),
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

export async function apiPut<T>(url: string, body: any, headers?: HeadersInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    method: "PUT",
    headers: getHeaders({ "Content-Type": "application/json", ...headers }),
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

export async function apiPatch<T>(url: string, body: any, headers?: HeadersInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    method: "PATCH",
    headers: getHeaders({ "Content-Type": "application/json", ...headers }),
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

export async function apiPostForm<T>(url: string, body: FormData, headers?: HeadersInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    method: "POST",
    headers: getHeaders(headers),
    body,
  });
  return handleResponse<T>(res);
}

export async function apiPutForm<T>(url: string, body: FormData, headers?: HeadersInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    method: "PUT",
    headers: getHeaders(headers),
    body,
  });
  return handleResponse<T>(res);
}

export async function apiDelete<T>(url: string, headers?: HeadersInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    method: "DELETE",
    headers: getHeaders(headers),
  });
  return handleResponse<T>(res);
}

