const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default async function verifyEmail(
    code: string
) {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/verify`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            verification_code: code
        }),
    });

    if (!response.ok) {
        throw new Error("Email verification failed");
    }

    return await response.json();
}