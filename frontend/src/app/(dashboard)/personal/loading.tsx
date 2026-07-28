import { ListSkeleton } from "@/components/loading/page-skeletons";

export default function PersonalLoading() {
  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <ListSkeleton rows={6} />
    </div>
  );
}
