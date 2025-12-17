const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
    throw new Error("VITE_API_BASE_URL is not defined");
}

export default async function loginWithGoogle() {
    const googleLoginUrl = `${API_BASE_URL}/api/v1/auth/google`;
    const oAuthUrlResp = await fetch(googleLoginUrl, {
        method: "GET",
        credentials: "include",
    })
    
    if (!oAuthUrlResp.ok) {
        throw new Error("Failed to get Google OAuth URL");
    }

    const { url } = await oAuthUrlResp.json();
    window.location.href = url;

}