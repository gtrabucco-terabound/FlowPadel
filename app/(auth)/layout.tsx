import Link from "next/link";
import { Logo } from "@/components/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10">
      <Link href="/" className="mb-6 flex justify-center">
        <Logo />
      </Link>
      {children}
    </div>
  );
}
