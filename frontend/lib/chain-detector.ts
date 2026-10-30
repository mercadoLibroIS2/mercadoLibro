import type { Book, TradeChain, User } from "./mercado-types"
import { isUserMatch } from "./mercado-types"

/**
 * Builds mock and detected trade chains based on available books and interested users (RF46)
 */
export function generateInitialChains(books: Book[], users: User[]): TradeChain[] {
  // Find books from distinct owners in demo
  const b1 = books.find((b) => isUserMatch({ id: b.ownerId, email: b.ownerId } as any, "lucia@mercadolibro.demo") && b.availability === "DISPONIBLE")
  const b2 = books.find((b) => isUserMatch({ id: b.ownerId, email: b.ownerId } as any, "mateo@mercadolibro.demo") && b.availability === "DISPONIBLE")
  const b3 = books.find((b) => isUserMatch({ id: b.ownerId, email: b.ownerId } as any, "tomas@mercadolibro.demo") && b.availability === "DISPONIBLE")

  if (!b1 || !b2 || !b3) return []

  const u1 = users.find((u) => isUserMatch(u, "lucia@mercadolibro.demo")) || { id: "lucia@mercadolibro.demo", name: "Lucía Fernández", avatar: "" }
  const u2 = users.find((u) => isUserMatch(u, "mateo@mercadolibro.demo")) || { id: "mateo@mercadolibro.demo", name: "Mateo Gómez", avatar: "" }
  const u3 = users.find((u) => isUserMatch(u, "tomas@mercadolibro.demo")) || { id: "tomas@mercadolibro.demo", name: "Tomás Rivero", avatar: "" }

  return [
    {
      id: "chain-circ-1",
      status: "PROPUESTA",
      createdAt: new Date().toISOString(),
      steps: [
        {
          userId: u1.id,
          userName: u1.name,
          userAvatar: u1.avatar,
          givesBook: b1,
          receivesBook: b3,
          confirmed: false,
        },
        {
          userId: u2.id,
          userName: u2.name,
          userAvatar: u2.avatar,
          givesBook: b2,
          receivesBook: b1,
          confirmed: true,
        },
        {
          userId: u3.id,
          userName: u3.name,
          userAvatar: u3.avatar,
          givesBook: b3,
          receivesBook: b2,
          confirmed: false,
        },
      ],
    },
  ]
}
