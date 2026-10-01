import { redirect } from "next/navigation";

// No public landing page yet
export default function Home() {
  redirect("/login");
}
