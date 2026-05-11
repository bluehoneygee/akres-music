import { AppShell } from "@/components/app-shell";
import { ResourcePage } from "@/components/resource-page";
import { invoiceStatusOptions } from "@/lib/options";

export default function BillingPage() {
  return (
    <AppShell>
      <ResourcePage
        description="Tagihan les pengganti Fees/Sales Invoice ERPNext: student, billing period, package, due date, dan status."
        fields={[
          { key: "studentId", label: "Student ID", required: true },
          { key: "instrumentId", label: "Instrument ID" },
          { key: "billingPeriod", label: "Billing period", required: true },
          { key: "lessonPackage", label: "Lesson package" },
          { key: "amount", label: "Amount", type: "number", required: true },
          { key: "dueDate", label: "Due date", type: "date", required: true },
          { key: "status", label: "Status", type: "select", options: invoiceStatusOptions, required: true },
        ]}
        resource="invoices"
        title="Billing"
      />
    </AppShell>
  );
}
