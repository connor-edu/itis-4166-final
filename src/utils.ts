import ky from "ky";
import { useLayoutEffect, useEffect } from "react";

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export { useIsomorphicLayoutEffect };
export const fetchWithAuth = ky.extend({
  hooks: {
    beforeRequest: [
      (req) => {
        const token = window.localStorage.getItem("__user");
        if (token) {
          req.headers.set("Authorization", `Bearer ${token}`);
        }
      },
    ],
  },
});
