// Taxas de entrega por bairro (Curitiba). VALORES DE EXEMPLO — ajuste à sua realidade.
// Na fase 2 esta lista virá da tabela `delivery_zones`, editável no Painel.
export interface DeliveryZone {
  id: string;
  name: string;
  fee: number;
}

export const DELIVERY_ZONES: DeliveryZone[] = [
  { id: "centro", name: "Centro", fee: 10 },
  { id: "batel", name: "Batel", fee: 10 },
  { id: "agua-verde", name: "Água Verde", fee: 10 },
  { id: "bigorrilho", name: "Bigorrilho", fee: 12 },
  { id: "merces", name: "Mercês", fee: 12 },
  { id: "juveve", name: "Juvevê", fee: 12 },
  { id: "cabral", name: "Cabral", fee: 12 },
  { id: "alto-da-xv", name: "Alto da XV", fee: 12 },
  { id: "reboucas", name: "Rebouças", fee: 12 },
  { id: "portao", name: "Portão", fee: 15 },
  { id: "santa-felicidade", name: "Santa Felicidade", fee: 18 },
  { id: "boqueirao", name: "Boqueirão", fee: 18 },
  { id: "cic", name: "Cidade Industrial (CIC)", fee: 20 },
];

/** Bairro não listado: taxa combinada pelo WhatsApp. */
export const OTHER_ZONE_ID = "outro";

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\(.*?\)/g, "").trim();

export function findZoneByNeighborhood(bairro: string): DeliveryZone | undefined {
  const n = normalize(bairro);
  if (!n) return undefined;
  return DELIVERY_ZONES.find((z) => normalize(z.name) === n);
}

export interface CepResult {
  street: string;
  neighborhood: string;
  city: string;
  state: string;
}

/** Consulta o CEP no ViaCEP (API pública e gratuita). */
export async function lookupCep(cep: string): Promise<CepResult | null> {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.erro) return null;
    return { street: data.logradouro ?? "", neighborhood: data.bairro ?? "", city: data.localidade ?? "", state: data.uf ?? "" };
  } catch {
    return null;
  }
}
