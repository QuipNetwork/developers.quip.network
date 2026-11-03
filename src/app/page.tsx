import { redirect } from "next/navigation";

// Temporary until the home page is ported from Astro.
export default function Home() {
  redirect("/docs");
}
