import Layout from "@/components/Layout";
import { MapPin, Heart, Shield, Users } from "lucide-react";

const values = [
  { icon: Heart, title: "Authentic Experiences", desc: "We partner with local communities to bring you genuine cultural encounters." },
  { icon: Shield, title: "Safe & Reliable", desc: "Every tour is vetted for safety with experienced, certified guides." },
  { icon: Users, title: "Small Groups", desc: "Intimate group sizes ensure personalized attention and less environmental impact." },
  { icon: MapPin, title: "Hidden Gems", desc: "We go beyond tourist traps to show you Africa's true beauty." },
];

const AboutPage = () => (
  <Layout>
    <section className="container mx-auto px-4 py-16">
      <div className="max-w-3xl mx-auto text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">About Songa</h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          Songa Travel & Tours was born from a passion for Africa's extraordinary beauty. We curate premium travel experiences that connect you with the continent's breathtaking landscapes, vibrant cultures, and incredible wildlife — all while supporting local communities.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-16">
        {values.map((v) => (
          <article key={v.title} className="rounded-2xl border border-border bg-card p-6 text-center card-hover">
            <div className="mx-auto mb-4 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <v.icon className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">{v.title}</h3>
            <p className="text-sm text-muted-foreground">{v.desc}</p>
          </article>
        ))}
      </div>

      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold mb-4 text-center">Our Story</h2>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            Founded in Nairobi, Kenya, Songa (meaning "move forward" in Swahili) represents our belief that travel transforms both the traveler and the communities they visit. What started as a small safari operation has grown into one of East Africa's most trusted tour companies.
          </p>
          <p>
            Our team of expert guides and travel designers meticulously craft each itinerary to balance adventure with comfort, ensuring every journey is both thrilling and sustainable. We work closely with conservation organizations and local businesses to ensure tourism benefits the people and wildlife of Africa.
          </p>
          <p>
            Whether you're watching the Great Migration in the Serengeti, exploring the spice islands of Zanzibar, or summiting Table Mountain, every Songa experience is designed to be unforgettable.
          </p>
        </div>
      </div>
    </section>
  </Layout>
);

export default AboutPage;
