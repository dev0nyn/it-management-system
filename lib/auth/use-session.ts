import { useSessionContext } from "./session-context";

export function useSession() {
  return useSessionContext();
}
