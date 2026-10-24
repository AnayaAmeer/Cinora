export type MenuCategory = "Cinnamon rolls" | "Cookies";

export type MenuItem = {
  id: string;
  name: string;
  category: MenuCategory;
  description: string;
  price: number;
  image: string;
  imageAlt: string;
  available: boolean;
};

/** Prices are in Pakistani rupees. Change them here when the menu changes. */
export const menu: MenuItem[] = [
  {
    id: "classic-roll",
    name: "Classic Cinnamon Roll",
    category: "Cinnamon rolls",
    description: "A golden spiral with a dark cinnamon-sugar filling, baked until the edge is just crisp.",
    price: 550,
    image: "/images/classic-roll.jpg",
    imageAlt: "Two golden cinnamon rolls on a white plate",
    available: true,
  },
  {
    id: "chocolate-chunk",
    name: "Chocolate Chunk Cookie",
    category: "Cookies",
    description: "A thick cookie with pools of dark chocolate and a soft, salted center.",
    price: 280,
    image: "/images/chocolate-chunk.jpg",
    imageAlt: "Chocolate chunk cookies on pale paper, one broken open",
    available: false,
  },
  {
    id: "chocolate-chip",
    name: "Chocolate Chip Cookie",
    category: "Cookies",
    description: "A warm golden cookie studded with dark chocolate chips.",
    price: 250,
    image: "/images/chocolate-chip.jpg",
    imageAlt: "A bowl of chocolate chip cookies lined with baking paper",
    available: false,
  },
];

export const categories: MenuCategory[] = ["Cinnamon rolls", "Cookies"];
