// Configurações da loja. No futuro estes valores virão da tabela `store_settings`
// (editável pelo Painel de Gestão) — ver ARQUITETURA.md.
export const STORE = {
  name: "M&S Empadas e Empadões",
  tagline: "Artesanal | Empadas & Empadinhas",
  whatsapp: "5541999854161", // formato internacional, só dígitos
  whatsappDisplay: "(41) 99985-4161",

  // Antecedência mínima para encomendas (preparo artesanal).
  leadTimeHours: 24,
  // Quantos dias à frente o cliente pode agendar.
  maxDaysAhead: 30,
  // 0 = domingo … 6 = sábado. Dias em que não há entregas/retiradas.
  closedWeekdays: [] as number[],
  // Janela de horários de entrega/retirada.
  openingTime: "10:00",
  closingTime: "19:00",
  slotMinutes: 30,

  // Empadões vendidos ao kg.
  kgStep: 0.5,
  kgMin: 0.5,
} as const;
