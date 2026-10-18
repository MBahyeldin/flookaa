export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-2 px-4 py-24 text-center">
      <h1 className="text-2xl font-bold text-foreground">Page not found</h1>
      <p className="text-muted-foreground">This page doesn't exist or isn't available to you.</p>
    </div>
  );
}
