const API_BASE_URL = `http://${window.location.hostname || "localhost"}:8000`;

async function apiRequest(path, { body, ...options } = {}) {
    const headers = new Headers(options.headers || {});
    if (body !== undefined) {
        headers.set("Content-Type", "application/json");
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers,
        credentials: "include",
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const result = await response.json();

    if (!response.ok) {
        const error = new Error(result.detail || `Error ${response.status}`);
        error.status = response.status;
        throw error;
    }

    return result;
}
