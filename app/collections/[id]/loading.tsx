export default function CollectionDetailLoading() {
  return (
    <div className="min-h-screen bg-[#0F0E0D] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-white/10 border-t-[#E07A3A] rounded-full animate-spin" />
        <p className="font-sans text-sm text-white/40">
          Loading collection...
        </p>
      </div>
    </div>
  );
}
