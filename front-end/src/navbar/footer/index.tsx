import { Brand } from "@/components/brand";

export default function Footer() {
  return (
    <footer className="flex items-center gap-6 px-4 py-6 md:px-6 lg:px-20">
      <Brand size="sm" className="flex-1" />
      <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Flookaa</p>
    </footer>
  );
}
