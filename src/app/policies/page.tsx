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
    <main className="min-h-screen bg-[#9E2A2B]">
      <LandingNavbar />

      <section className="bg-[#9E2A2B] pb-10 pt-24 sm:pb-12 sm:pt-32">
        <div className="w-full px-4 sm:px-6">
          <h2 className="text-left text-xl font-semibold text-[#E09F3E] sm:text-2xl md:text-3xl">
            Enrollment & Fees
          </h2>
          <div className="mt-6 sm:mt-8">
          <PolicyFaqAccordion
            background="#9E2A2B"
            items={policyDropdowns}
            scrollableAnswer
            triggerBackground="#F7F4D5"
            triggerTextColor="#000000"
          />
          </div>
        </div>
      </section>

      <section className="bg-[#E09F3E] py-10 sm:py-14">
        <div className="w-full px-4 sm:px-6">
          <h2 className="text-left text-xl font-semibold text-[#9E2A2B] sm:text-2xl md:text-3xl">
            Frequently Asked Questions
          </h2>
          <div className="mt-6 sm:mt-8">
              <PolicyFaqAccordion
              background="#E09F3E"
              items={faqs}
              triggerBackground="#F7F4D5"
              triggerTextColor="#000000"
            />
          </div>
        </div>
      </section>

      <LandingFooter />
    </main>
  );
}
