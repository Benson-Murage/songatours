import Layout from "@/components/Layout";
import useSEO from "@/hooks/useSEO";

const RefundPage = () => {
  useSEO({ title: "Refund Policy", description: "Songa Travel & Tours refund and cancellation policy for tour bookings." });

  return (
    <Layout>
      <article className="container mx-auto px-4 py-16 max-w-3xl prose prose-neutral dark:prose-invert">
        <h1>Refund Policy</h1>
        <p className="text-muted-foreground">Last updated: March 8, 2026</p>

        <h2>Cancellation Windows</h2>
        <table>
          <thead>
            <tr>
              <th>Cancellation Period</th>
              <th>Refund Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>30+ days before departure</td><td>Full refund (minus processing fees)</td></tr>
            <tr><td>15–29 days before departure</td><td>50% refund</td></tr>
            <tr><td>7–14 days before departure</td><td>25% refund</td></tr>
            <tr><td>Less than 7 days</td><td>No refund</td></tr>
          </tbody>
        </table>

        <h2>How to Request a Refund</h2>
        <ol>
          <li>Log into your account and navigate to "My Trips".</li>
          <li>Click "Cancel" on the booking you wish to cancel.</li>
          <li>The cancellation will be processed and you'll receive a confirmation email.</li>
          <li>Refunds are processed within 7–14 business days to the original payment method.</li>
        </ol>

        <h2>Tour Cancellations by Songa</h2>
        <p>If we cancel a tour due to safety concerns, insufficient enrollment, or force majeure, you will be offered:</p>
        <ul>
          <li>A full refund, or</li>
          <li>Rescheduling to an alternative date at no extra cost</li>
        </ul>

        <h2>Non-Refundable Items</h2>
        <ul>
          <li>No-show on departure day</li>
          <li>Early departure from a tour in progress</li>
          <li>Visa or travel document issues</li>
        </ul>

        <h2>Contact for Refund Inquiries</h2>
        <p>Email: <a href="mailto:salmajeods11@gmail.com" className="text-primary">salmajeods11@gmail.com</a></p>
        <p>Phone: +254 796 102 412</p>
      </article>
    </Layout>
  );
};

export default RefundPage;
