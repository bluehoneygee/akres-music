import { LandingFooter } from "@/components/landing-footer";
import { LandingNavbar } from "@/components/landing-navbar";

function AccordionSkeleton({ withAnswer = false }: { withAnswer?: boolean }) {
  return (
    <div className="mb-4">
      <div className="h-[76px] w-full animate-pulse rounded-l-md bg-black" />
      {withAnswer ? (
        <div className="-mt-4 ml-6 mr-0 rounded-bl-md bg-white px-6 pb-5 pt-8">
          <div className="h-4 w-[92%] animate-pulse rounded bg-zinc-200" />
          <div className="mt-3 h-4 w-[82%] animate-pulse rounded bg-zinc-200" />
          <div className="mt-3 h-4 w-[75%] animate-pulse rounded bg-zinc-200" />
        </div>
      ) : null}
    </div>
  );
}

export default function PoliciesLoading() {
  return (
    <main className="min-h-screen bg-[#f5f5f5]">
      <LandingNavbar />

      <section className="bg-[#eef2f7] pb-12 pt-32">
        <div className="w-full pl-6 pr-0">
          <div className="mb-3 h-5 w-40 animate-pulse rounded bg-black/20" />
          <AccordionSkeleton withAnswer />
          <div className="mb-3 mt-5 h-5 w-28 animate-pulse rounded bg-black/20" />
          <AccordionSkeleton />
        </div>
      </section>

      <section className="bg-[#ffd700] py-14">
        <div className="w-full pl-6 pr-0">
          <div className="mx-auto mb-8 h-10 w-96 max-w-[85%] animate-pulse rounded bg-black/20" />
          <AccordionSkeleton />
          <AccordionSkeleton withAnswer />
          <AccordionSkeleton />
          <AccordionSkeleton />
        </div>
      </section>

      <LandingFooter />
    </main>
  );
}
