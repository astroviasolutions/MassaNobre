# Massa Nobre — Sistema de Pedidos

Catálogo digital + carrinho + checkout com envio do pedido por WhatsApp.
Arquitetura e plano do Painel de Gestão: [ARQUITETURA.md](ARQUITETURA.md).

## Rodar localmente

Requisito: [Node.js 20+](https://nodejs.org) (versão LTS).

```bash
npm install
npm run dev
```

Abra http://localhost:3000.

## Onde ajustar

- **Preços e sabores** — `src/lib/menu.ts` (`available: false` marca como "Esgotado hoje").
- **Bairros e taxas de entrega** — `src/lib/delivery.ts` (os valores atuais são exemplos).
- **Horários, antecedência, WhatsApp** — `src/lib/config.ts`.
- **Cores e fontes** — `src/app/globals.css`.
