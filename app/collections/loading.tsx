export default function CollectionsLoading() {
  return (
    <div className="min-h-screen bg-page-bg flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-border-default border-t-[#E07A3A] rounded-full animate-spin" />
        <p className="font-sans text-sm text-text-muted">
          Loading collections...
        </p>
      </div>
    </div>
  );
}
