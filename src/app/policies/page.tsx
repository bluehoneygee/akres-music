import { LandingFooter } from "@/components/landing-footer";
import { PolicyFaqAccordion } from "@/components/policy-faq-accordion";
import { LandingNavbar } from "@/components/landing-navbar";
import type { ReactNode } from "react";
import { FAQS, POLICY_DROPDOWN_SOURCES } from "@/app/policies/constants/policies-data";

const policyDropdowns: { q: string; a: ReactNode }[] = POLICY_DROPDOWN_SOURCES.map((group) => ({
  q: group.q,
  a: (
    <ul className="list-disc space-y-2 pl-5">
      {group.items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  ),
}));

const faqs: { q: string; a: ReactNode }[] = FAQS;

export default function PoliciesPage() {
  return (
    <main className="min-h-screen bg-[#f5f5f5]">
      <LandingNavbar />

      <section className="bg-[#eef2f7] pb-10 pt-24 sm:pb-12 sm:pt-32">
        <div className="w-full">
          <PolicyFaqAccordion background="#eef2f7" items={policyDropdowns} scrollableAnswer />
        </div>
      </section>

      <section className="bg-[#ffd700] py-10 sm:py-14">
        <div className="w-full px-4 sm:px-6">
          <h2 className="text-center text-2xl font-semibold text-black sm:text-3xl md:text-4xl">
            Frequently Asked Questions
          </h2>
          <div className="mt-6 sm:mt-8">
            <PolicyFaqAccordion background="#ffd700" items={faqs} />
          </div>
        </div>
      </section>

      <LandingFooter />
    </main>
  );
}
