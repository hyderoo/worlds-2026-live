import type { Metadata } from "next";
import { LoginForm } from "@/components/admin";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false } };
export default function Page() { return <LoginForm />; }
