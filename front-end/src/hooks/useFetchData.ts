import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function useFetchData<T>(callFb: () => Promise<T | null>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Simulate network delay for demonstration purposes
        // await new Promise((resolve) => setTimeout(resolve, 2000));

        const result = await callFb();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        toast("Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [callFb]);

  return { loading, error, data };
}
