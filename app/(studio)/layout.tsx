import { redirect } from "next/navigation";
import { SessionProvider } from "../../context/SessionContext";
import { getSessionUser } from "../lib/session";

/** Layout for authenticated studio pages. Unauthenticated visits are redirected to /login. */
export default async function StudioLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return <SessionProvider user={user}>{children}</SessionProvider>;
}
