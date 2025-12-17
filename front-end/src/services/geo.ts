const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error("API_BASE_URL is not defined");
}

export const getCountries = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/geo/countries`, {
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error("Failed to fetch countries");
    }
    const data = await response.json();
    return data.countries;
  } catch (error) {
    console.error("Error fetching countries:", error);
    throw error;
  }
};

export const getStatesByCountryID = async (countryID: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/geo/countries/${countryID}/states`, {
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error("Failed to fetch states");
    }
    const data = await response.json();
    return data.states;
  } catch (error) {
    console.error("Error fetching states:", error);
    throw error;
  }
};

export const searchCitiesByStateId = async ({
  stateId,
  search = "",
}: {
  stateId: string;
  search?: string;
}) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/geo/states/${stateId}/cities?search=${encodeURIComponent(
        search
      )}`,
      { credentials: "include" }
    );
    if (!response.ok) {
      throw new Error("Failed to fetch cities");
    }
    const data = await response.json();
    return data.cities;
  } catch (error) {
    console.error("Error fetching cities:", error);
    throw error;
  }
};
