export interface Employee {
  id: string;
  cpf: string;
  name: string;
  store?: string;
  position?: string;
  sector?: string;
  startDate?: string; // Optional
  isInternal: boolean;
  role?: string; // Para colaboradores externos (STAFF, Segurança, etc.)
}