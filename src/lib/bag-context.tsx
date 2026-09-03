import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { CartItem, Product } from "./supabase";

type BagContextType = {
  items: CartItem[];
  wishlist: Product[];
  addToBag: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeFromBag: (index: number) => void;
  updateQuantity: (index: number, quantity: number) => void;
  clearBag: () => void;
  bagCount: () => number;
  bagTotal: () => number;
  addToWishlist: (product: Product) => void;
  removeFromWishlist: (id: string) => void;
  isInWishlist: (id: string) => boolean;
};

const BagContext = createContext<BagContextType | null>(null);

export function BagProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("kiyumi_bag") || "[]");
    } catch {
      return [];
    }
  });

  const [wishlist, setWishlist] = useState<Product[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("kiyumi_wishlist") || "[]");
    } catch {
      return [];
    }
  });

  const addToBag = useCallback(
    (item: Omit<CartItem, "quantity"> & { quantity?: number }) => {
      setItems((prev) => {
        const existing = prev.findIndex(
          (i) =>
            i.product.id === item.product.id &&
            i.size === item.size &&
            i.color === item.color,
        );
        if (existing >= 0) {
          const next = [...prev];
          next[existing] = {
            ...next[existing],
            quantity: next[existing].quantity + (item.quantity ?? 1),
          };
          localStorage.setItem("kiyumi_bag", JSON.stringify(next));
          return next;
        }
        const next = [...prev, { ...item, quantity: item.quantity ?? 1 }];
        localStorage.setItem("kiyumi_bag", JSON.stringify(next));
        return next;
      });
    },
    [],
  );

  const removeFromBag = useCallback((index: number) => {
    setItems((prev) => {
      const next = prev.filter((_, i) => i !== index);
      localStorage.setItem("kiyumi_bag", JSON.stringify(next));
      return next;
    });
  }, []);

  const updateQuantity = useCallback((index: number, quantity: number) => {
    if (quantity < 1) return;
    setItems((prev) => {
      const next = prev.map((item, i) =>
        i === index ? { ...item, quantity } : item,
      );
      localStorage.setItem("kiyumi_bag", JSON.stringify(next));
      return next;
    });
  }, []);

  const clearBag = useCallback(() => {
    setItems([]);
    localStorage.setItem("kiyumi_bag", "[]");
  }, []);

  const bagCount = useCallback(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items],
  );

  const bagTotal = useCallback(
    () => items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
    [items],
  );

  const addToWishlist = useCallback((product: Product) => {
    setWishlist((prev) => {
      if (prev.some((p) => p.id === product.id)) return prev;
      const next = [...prev, product];
      localStorage.setItem("kiyumi_wishlist", JSON.stringify(next));
      return next;
    });
  }, []);

  const removeFromWishlist = useCallback((id: string) => {
    setWishlist((prev) => {
      const next = prev.filter((p) => p.id !== id);
      localStorage.setItem("kiyumi_wishlist", JSON.stringify(next));
      return next;
    });
  }, []);

  const isInWishlist = useCallback(
    (id: string) => wishlist.some((p) => p.id === id),
    [wishlist],
  );

  return (
    <BagContext.Provider
      value={{
        items,
        wishlist,
        addToBag,
        removeFromBag,
        updateQuantity,
        clearBag,
        bagCount,
        bagTotal,
        addToWishlist,
        removeFromWishlist,
        isInWishlist,
      }}
    >
      {children}
    </BagContext.Provider>
  );
}

export function useBag() {
  const ctx = useContext(BagContext);
  if (!ctx) throw new Error("useBag must be used within BagProvider");
  return ctx;
}
