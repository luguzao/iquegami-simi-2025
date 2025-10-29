import { LoginForm } from "@/components/login/login-form";
import Art from "../assets/art.png";
import Image from "next/image";

export default function Home() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <Image src={Art} alt="Art" className="md:hidden inset-0 h-full w-80 mb-5 object-cover dark:brightness-[0.2] dark:grayscale" />
      <div className="w-full max-w-sm md:max-w-4xl">
        <LoginForm />
      </div>
    </div>
  );
}
