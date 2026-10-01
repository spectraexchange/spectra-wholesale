"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; count?: number };

export function NavLinks({ items, className = "" }: { items: NavItem[]; className?: string }) {
  const pathname = usePathname();

  return (
    <nav className={`items-stretch gap-1 self-stretch ${className}`}>
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`relative flex items-center px-3 py-3.5 text-[14px] whitespace-nowrap transition-colors after:absolute after:inset-x-3 after:bottom-0 after:h-[2px] after:transition-colors ${
              active ? "text-cream after:bg-sunset-bright" : "text-cream/60 after:bg-transparent hover:text-cream"
            }`}
          >
            {item.label}
            {!!item.count && <span className="ml-1.5 font-mono text-[12px] text-amber">{item.count}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
