export default function Spinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <div className="w-10 h-10 border-4 border-bvb-teal/30 border-t-bvb-teal rounded-full animate-spin" />
      <p className="text-text-secondary text-sm">{message}</p>
    </div>
  );
}
