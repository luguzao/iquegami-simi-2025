"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Art from "../../assets/art.png"
import { createClient } from "@/lib/supabase"
import { useState } from "react"
import { toast } from "sonner"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {

  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    
    try {
      const supabase = createClient();
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        const errorMessage = error.message.toLowerCase().includes("invalid login credentials") 
          ? "Credenciais inválidas" 
          : error.message;
        toast.error("Erro no login", {
          description: errorMessage,
        });
      } else {
        toast.success("Login realizado com sucesso!");

        // Redirecionar imediatamente - o middleware vai cuidar do resto
        router.push('/dashboard');
        router.refresh(); // Força a atualização do middleware
      }
    } catch (err) {
      toast.error("Erro inesperado", {
        description: "Ocorreu um erro ao tentar fazer login. Tente novamente.",
      });
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  }


  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={e=> {
            e.preventDefault()
            handleLogin()
          }}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Bem-vindo de volta</h1>
                <p className="text-muted-foreground text-balance">
                  Acesse o sistema SIMI
                </p>
              </div>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Senha</FieldLabel>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
              </Field>
              <Field>
                <Button type="submit" className="bg-iquegami hover:bg-iquegami/90" disabled={loading}>
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </Field>
            </FieldGroup>
          </form>
          <div className=" relative hidden md:block bg-iquegami p-5">
            <Image
              src={Art}
              alt="Art"
              className=" inset-0 h-full w-full object-scale-down dark:brightness-[0.2] dark:grayscale"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
