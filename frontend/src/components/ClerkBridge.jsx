import { useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { clearTokenGetter, setTokenGetter } from "@/lib/api";

function ClerkBridge() {
  const { getToken } = useAuth();

  useEffect(() => {
    setTokenGetter(async () => {
      const token = await getToken();
      return token || null;
    });

    return () => {
      clearTokenGetter();
    };
  }, [getToken]);

  return null;
}

export default ClerkBridge;

