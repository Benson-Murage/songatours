import Layout from "@/components/Layout";
import useSEO from "@/hooks/useSEO";

const TermsPage = () => {
  useSEO({ title: "Terms & Conditions", description: "Songa Travel & Tours terms and conditions for booking tours and using our platform." });

  return (
    <Layout>
      <article className="container mx-auto px-4 py-16 max-w-3xl prose prose-neutral dark:prose-invert">
        <h1>Terms & Conditions</h1>
        <p className="text-muted-foreground">Last updated: March 8, 2026</p>

        <h2>1. Booking Terms</h2>
        <p>By making a booking through Songa Travel & Tours, you agree to these terms. All bookings are subject to availability and confirmation.</p>
        <ul>
          <li>A deposit of 30% (or as specified per tour) is required to confirm your booking.</li>
          <li>The remaining balance must be paid before the departure date.</li>
          <li>Booking references (SGT-YYYY-XXXXX) are issued upon confirmation.</li>
        </ul>

        <h2>2. Cancellation & Refund Policy</h2>
        <ul>
          <li><strong>30+ days before departure:</strong> Full refund minus processing fees.</li>
          <li><strong>15–29 days before departure:</strong> 50% refund of the total amount.</li>
          <li><strong>7–14 days before departure:</strong> 25% refund of the total amount.</li>
          <li><strong>Less than 7 days:</strong> No refund.</li>
          <li>Tour cancellations by Songa will receive a full refund or rescheduling option.</li>
        </ul>

        <h2>3. Traveler Responsibilities</h2>
        <ul>
          <li>Provide accurate personal information during booking.</li>
          <li>Ensure valid travel documents (passport, visas) where required.</li>
          <li>Follow safety instructions from tour guides.</li>
          <li>Arrive at designated meeting points on time.</li>
        </ul>

        <h2>4. Liability</h2>
        <p>Songa Travel & Tours acts as an organizer and coordinator. While we take every precaution for safety, we are not liable for:</p>
        <ul>
          <li>Injuries, loss, or damage arising from activities during tours.</li>
          <li>Weather-related changes or cancellations.</li>
          <li>Personal belongings lost during tours.</li>
        </ul>
        <p>We strongly recommend purchasing travel insurance before departure.</p>

        <h2>5. Modifications</h2>
        <p>Songa reserves the right to modify tour itineraries due to weather, safety, or logistical reasons. We will communicate changes promptly.</p>

        <h2>6. Promo Codes & Referrals</h2>
        <ul>
          <li>Promo codes are subject to validity periods and usage limits.</li>
          <li>Referral rewards are credited after the referred booking is confirmed.</li>
          <li>Songa reserves the right to modify or discontinue promotions.</li>
        </ul>

        <h2>7. Contact</h2>
        <p>Questions about these terms? Contact us at <a href="mailto:salmajeods11@gmail.com" className="text-primary">salmajeods11@gmail.com</a>.</p>
      </article>
    </Layout>
  );
};

export default TermsPage;
