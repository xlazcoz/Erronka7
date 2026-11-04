const API_BASE_URL = `http://${window.location.hostname || "localhost"}:8000`;

function formatearErrorApi(result, status) {
    const detail = result?.detail ?? result?.message ?? result;

    if (Array.isArray(detail)) {
        const mensajes = detail
            .map((item) => item?.msg || item?.message || String(item))
            .filter(Boolean)
            .join(". ");
        return mensajes || `Error ${status}`;
    }

    if (detail && typeof detail === "object") {
        return detail.msg || detail.message || `Error ${status}`;
    }

    return detail || `Error ${status}`;
}

async function apiRequest(path, { body, ...options } = {}) {
    const headers = new Headers(options.headers || {});
    if (body !== undefined) {
        headers.set("Content-Type", "application/json");
    }

    let response;
    try {
        response = await fetch(`${API_BASE_URL}${path}`, {
            ...options,
            headers,
            credentials: "include",
            body: body === undefined ? undefined : JSON.stringify(body),
        });
    } catch (error) {
        const networkError = new Error(
            "No se pudo conectar con el servidor. Comprueba que la API esté en marcha.",
        );
        networkError.status = 0;
        networkError.cause = error;
        throw networkError;
    }

    const contentType = response.headers.get("content-type") || "";
    let result = null;

    if (response.status !== 204) {
        if (contentType.includes("application/json")) {
            result = await response.json().catch(() => null);
        } else {
            const text = await response.text().catch(() => "");
            result = text ? { detail: text } : null;
        }
    }

    if (!response.ok) {
        const error = new Error(formatearErrorApi(result, response.status));
        error.status = response.status;
        error.data = result;
        throw error;
    }

    return result;
}
