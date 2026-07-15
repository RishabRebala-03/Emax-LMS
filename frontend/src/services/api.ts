export const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://127.0.0.1:5000";

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
    throw new Error(message);
  }
  return res.json();
}

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`);
  return handleResponse<T>(res);
}

export async function apiPost<T>(url: string, body: any): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

export async function apiPut<T>(url: string, body: any): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

export async function apiPatch<T>(url: string, body: any): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

export async function apiPostForm<T>(url: string, body: FormData): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    method: "POST",
    body,
  });
  return handleResponse<T>(res);
}

export async function apiPutForm<T>(url: string, body: FormData): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    method: "PUT",
    body,
  });
  return handleResponse<T>(res);
}

export async function apiDelete<T>(url: string): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, { method: "DELETE" });
  return handleResponse<T>(res);
}
