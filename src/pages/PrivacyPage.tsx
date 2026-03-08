import Layout from "@/components/Layout";
import useSEO from "@/hooks/useSEO";

const PrivacyPage = () => {
  useSEO({ title: "Privacy Policy", description: "Songa Travel & Tours privacy policy — how we collect, use, and protect your personal data." });

  return (
    <Layout>
      <article className="container mx-auto px-4 py-16 max-w-3xl prose prose-neutral dark:prose-invert">
        <h1>Privacy Policy</h1>
        <p className="text-muted-foreground">Last updated: March 8, 2026</p>

        <h2>1. Information We Collect</h2>
        <p>When you use Songa Travel & Tours, we collect information you provide directly:</p>
        <ul>
          <li><strong>Account data:</strong> name, email address, phone number</li>
          <li><strong>Booking data:</strong> tour selections, travel dates, guest counts, special requests</li>
          <li><strong>Profile data:</strong> nationality, emergency contact (optional)</li>
          <li><strong>Payment data:</strong> payment references (we do not store card numbers)</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <ul>
          <li>Process and manage your tour bookings</li>
          <li>Send booking confirmations, reminders, and updates</li>
          <li>Provide customer support</li>
          <li>Improve our services and user experience</li>
          <li>Comply with legal obligations</li>
        </ul>

        <h2>3. Information Sharing</h2>
        <p>We do not sell your personal information. We share data only with:</p>
        <ul>
          <li>Tour operators and guides (for trip logistics)</li>
          <li>Payment processors (to complete transactions)</li>
          <li>Email service providers (for notifications)</li>
          <li>Law enforcement (when legally required)</li>
        </ul>

        <h2>4. Data Security</h2>
        <p>We use industry-standard security measures including encrypted connections (HTTPS), secure database access controls, and role-based authentication to protect your data.</p>

        <h2>5. Your Rights</h2>
        <p>You may request access to, correction of, or deletion of your personal data by contacting us at <a href="mailto:salmajeods11@gmail.com" className="text-primary">salmajeods11@gmail.com</a>.</p>

        <h2>6. Cookies</h2>
        <p>We use essential cookies for authentication and session management. No third-party tracking cookies are used.</p>

        <h2>7. Contact Us</h2>
        <p>For privacy inquiries: <a href="mailto:salmajeods11@gmail.com" className="text-primary">salmajeods11@gmail.com</a> or call +254 796 102 412.</p>
      </article>
    </Layout>
  );
};

export default PrivacyPage;
