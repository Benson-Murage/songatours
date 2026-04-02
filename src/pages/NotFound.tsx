import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import AppLogo from "@/components/AppLogo";

const NotFound = () => (
  <Layout>
    <div className="container mx-auto px-4 py-20 text-center">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex justify-center">
          <AppLogo size="xl" linkTo={false} />
        </div>
        <h1 className="text-7xl font-extrabold text-foreground mb-4">404</h1>
        <h2 className="text-xl font-semibold text-foreground mb-2">Page not found</h2>
        <p className="text-muted-foreground mb-8">
          Looks like this trail doesn't exist. Let's get you back on track.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/">
            <Button variant="accent" size="lg">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Home
            </Button>
          </Link>
          <Link to="/destinations">
            <Button variant="outline" size="lg">Explore Destinations</Button>
          </Link>
        </div>
      </div>
    </div>
  </Layout>
);

export default NotFound;
