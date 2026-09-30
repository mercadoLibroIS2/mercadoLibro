import type { Book, TradeChain, User } from "./mercado-types"

/**
 * Builds mock and detected trade chains based on available books and interested users (RF46)
 */
export function generateInitialChains(books: Book[], users: User[]): TradeChain[] {
  // Find books from distinct owners
  const b1 = books.find((b) => b.ownerId === "user-2" && b.availability === "DISPONIBLE") // Miguel
  const b2 = books.find((b) => b.ownerId === "user-3" && b.availability === "DISPONIBLE") // Camila
  const b3 = books.find((b) => b.ownerId === "user-1" && b.availability === "DISPONIBLE") // Franco

  if (!b1 || !b2 || !b3) return []

  const u1 = users.find((u) => u.id === "user-1") || { id: "user-1", name: "Franco Papa", avatar: "" }
  const u2 = users.find((u) => u.id === "user-2") || { id: "user-2", name: "Miguel Bartesaghi", avatar: "" }
  const u3 = users.find((u) => u.id === "user-3") || { id: "user-3", name: "Camila García", avatar: "" }

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
          givesBook: b3,
          receivesBook: b1,
          confirmed: false,
        },
        {
          userId: u2.id,
          userName: u2.name,
          userAvatar: u2.avatar,
          givesBook: b1,
          receivesBook: b2,
          confirmed: true,
        },
        {
          userId: u3.id,
          userName: u3.name,
          userAvatar: u3.avatar,
          givesBook: b2,
          receivesBook: b3,
          confirmed: false,
        },
      ],
    },
  ]
}
