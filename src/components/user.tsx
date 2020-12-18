import { createContext, useContext, useEffect, useState } from "react";

export type User = {
  uid: number;
  username: string;
};
export type UserContext = {
  user: User | null;
  setUser: (u: User | null) => void;
};
export const userContext = createContext<UserContext>(null);
export const useUser = () => {
  return useContext(userContext);
};

export const UserProvider: React.FC = ({ children }) => {
  const [user, setUser] = useState(null);
  useEffect(() => {
    const stored = globalThis?.localStorage?.getItem("__user");
    // no stored session
    if (!stored) {
      return;
    }

    // split the jwt into its 3 sections
    const parts = stored.split(".");
    if (parts.length !== 3) {
      return;
    }

    const [, info] = parts;
    try {
      const user = JSON.parse(atob(info));
      setUser(user);
    } catch (_e) {
      return;
    }
  }, []);
  return <userContext.Provider value={{ user, setUser: (u) => setUser(u) }}>{children}</userContext.Provider>;
};
