/** Modo demonstração (portfólio): reset diário, login de demonstração visível e configurações travadas. */
export function isDemoMode() {
  return process.env.DEMO_MODE === "true";
}

/** Credenciais do admin de demonstração exibidas na tela de login (só em DEMO_MODE). */
export function demoAdminCredentials() {
  const email = process.env.DEMO_ADMIN_EMAIL;
  const password = process.env.DEMO_ADMIN_PASSWORD;
  return isDemoMode() && email && password ? { email, password } : null;
}

/** Horário do reset diário, para exibir (o agendamento está no vercel.json, em UTC). */
export const DEMO_RESET_TIME = "3h (horário de Brasília)";
